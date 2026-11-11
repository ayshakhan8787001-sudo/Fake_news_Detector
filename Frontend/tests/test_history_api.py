import json
import sqlite3
import tempfile
import unittest
from contextlib import closing
from pathlib import Path
from unittest.mock import patch

import numpy as np

import app as detector
import database


class HistoryApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp_dir = tempfile.TemporaryDirectory()
        cls.database_path_patch = patch.object(
            database,
            "DATABASE_PATH",
            Path(cls.temp_dir.name) / "test.sqlite3",
        )
        cls.database_path_patch.start()
        database.initialize_database()

    @classmethod
    def tearDownClass(cls):
        cls.database_path_patch.stop()
        cls.temp_dir.cleanup()

    def setUp(self):
        database.clear_investigations()
        self.client = detector.app.test_client()

    def test_health_endpoint_identifies_the_detector_service(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.get_json(),
            {"status": "ok", "service": "news-detector-api"},
        )

    def test_prediction_is_saved_and_can_be_cleared(self):
        evidence = {
            "available": False,
            "provider": "NewsAPI",
            "message": "Not configured",
            "articles": [],
        }
        with patch.object(detector, "search_related_news", return_value=evidence):
            response = self.client.post(
                "/predict",
                json={"text": "A sample claim to test persistent history.", "is_url": False},
            )

        self.assertEqual(response.status_code, 200)
        result = response.get_json()
        self.assertGreater(result["history_id"], 0)
        self.assertIsInstance(result["confidence"], float)
        self.assertGreaterEqual(result["confidence"], 0)
        self.assertLessEqual(result["confidence"], 1)

        history_response = self.client.get("/history")
        self.assertEqual(history_response.status_code, 200)
        history = history_response.get_json()
        self.assertEqual(len(history), 1)
        self.assertEqual(history[0]["text"], "A sample claim to test persistent history.")
        self.assertEqual(history[0]["evidence"], [])

        clear_response = self.client.delete("/history")
        self.assertEqual(clear_response.status_code, 200)
        self.assertEqual(self.client.get("/history").get_json(), [])

    def test_prediction_and_confidence_are_case_insensitive(self):
        evidence = {
            "available": False,
            "provider": "NewsAPI",
            "message": "Not configured",
            "articles": [],
        }
        inputs = [
            "is modi a prime minister of inida",
            "IS MODI A PRIME MINISTER OF INIDA",
            "Is Modi a Prime Minister of Inida",
        ]
        with patch.object(detector, "search_related_news", return_value=evidence):
            results = [
                self.client.post(
                    "/predict",
                    json={"text": text, "is_url": False},
                ).get_json()
                for text in inputs
            ]

        model_outputs = [
            (result["prediction"], result["uncertain"], result["confidence"])
            for result in results
        ]
        self.assertEqual(model_outputs, [model_outputs[0]] * len(inputs))

    def test_weak_decision_margin_triggers_uncertainty(self):
        evidence = {
            "available": False,
            "provider": "NewsAPI",
            "message": "Not configured",
            "articles": [],
        }
        with patch.object(detector, "search_related_news", return_value=evidence):
            with patch.object(detector.model, "predict", return_value=np.array([1])):
                with patch.object(
                    detector.confidence_model,
                    "predict_proba",
                    return_value=np.array([[0.1, 0.9]]),
                ):
                    with patch.object(
                        detector.model,
                        "decision_function",
                        return_value=np.array([0.20]),
                    ):
                        uncertain = self.client.post(
                            "/predict",
                            json={
                                "text": "A sample short claim with enough words to avoid the short input rule.",
                                "is_url": False,
                            },
                        ).get_json()
                    with patch.object(
                        detector.model,
                        "decision_function",
                        return_value=np.array([0.23]),
                    ):
                        classified = self.client.post(
                            "/predict",
                            json={
                                "text": "A sample short claim with enough words to avoid the short input rule.",
                                "is_url": False,
                            },
                        ).get_json()

        self.assertTrue(uncertain["uncertain"])
        self.assertFalse(classified["uncertain"])

    def test_prediction_confidence_and_model_disagreement(self):
        evidence = {
            "available": False,
            "provider": "NewsAPI",
            "message": "Not configured",
            "articles": [],
        }
        cases = (
            (1, [0.1, 0.9], False, 0.9),
            (0, [0.9, 0.1], False, 0.9),
            (1, [0.9, 0.1], True, 0.1),
            (0, [0.1, 0.9], True, 0.1),
        )

        with patch.object(detector, "search_related_news", return_value=evidence):
            for primary_prediction, probabilities, disagreement, expected_confidence in cases:
                with self.subTest(
                    primary_prediction=primary_prediction,
                    probabilities=probabilities,
                ):
                    with patch.object(
                        detector.model,
                        "predict",
                        return_value=np.array([primary_prediction]),
                    ):
                        with patch.object(
                            detector.model,
                            "decision_function",
                            return_value=np.array([1.0]),
                        ):
                            with patch.object(
                                detector.confidence_model,
                                "predict_proba",
                                return_value=np.array([probabilities]),
                            ):
                                result = self.client.post(
                                    "/predict",
                                    json={
                                        "text": "A longer sample claim for checking model agreement behavior.",
                                        "is_url": False,
                                    },
                                ).get_json()

                    self.assertEqual(result["prediction"], bool(primary_prediction))
                    self.assertEqual(result["uncertain"], disagreement)
                    self.assertEqual(result["model_disagreement"], disagreement)
                    self.assertAlmostEqual(result["confidence"], expected_confidence)

    def test_opinion_like_short_input_is_uncertain_even_when_models_agree(self):
        evidence = {
            "available": False,
            "provider": "NewsAPI",
            "message": "Not configured",
            "articles": [],
        }
        with patch.object(detector, "search_related_news", return_value=evidence):
            with patch.object(detector.model, "predict", return_value=np.array([1])):
                with patch.object(
                    detector.model,
                    "decision_function",
                    return_value=np.array([1.0]),
                ):
                    with patch.object(
                        detector.confidence_model,
                        "predict_proba",
                        return_value=np.array([[0.1, 0.9]]),
                    ):
                        result = self.client.post(
                            "/predict",
                            json={
                                "text": "Narendra Modi has gone mad",
                                "is_url": False,
                            },
                        ).get_json()

        self.assertTrue(result["uncertain"])
        self.assertTrue(result["short_input"])
        self.assertFalse(result["model_disagreement"])
        self.assertEqual(result["word_count"], 5)
        self.assertEqual(result["confidence"], 0.9)

    def test_short_factual_text_uses_model_uncertainty_not_word_count(self):
        evidence = {
            "available": False,
            "provider": "NewsAPI",
            "message": "Not configured",
            "articles": [],
        }
        with patch.object(detector, "search_related_news", return_value=evidence):
            with patch.object(detector.model, "predict", return_value=np.array([1])):
                with patch.object(
                    detector.model,
                    "decision_function",
                    return_value=np.array([1.0]),
                ):
                    with patch.object(
                        detector.confidence_model,
                        "predict_proba",
                        return_value=np.array([[0.1, 0.9]]),
                    ):
                        result = self.client.post(
                            "/predict",
                            json={"text": "India won the 2024 T20 World Cup.", "is_url": False},
                        ).get_json()

        self.assertTrue(result["short_input"])
        self.assertFalse(result["uncertain"])
        self.assertIsNone(result["uncertain_reason"])
        self.assertTrue(result["prediction"])

    def test_opinion_like_text_is_uncertain_not_a_factual_verdict(self):
        evidence = {
            "available": False,
            "provider": "NewsAPI",
            "message": "Not configured",
            "articles": [],
        }
        with patch.object(detector, "search_related_news", return_value=evidence):
            with patch.object(detector.model, "predict", return_value=np.array([0])):
                with patch.object(
                    detector.model,
                    "decision_function",
                    return_value=np.array([-1.0]),
                ):
                    with patch.object(
                        detector.confidence_model,
                        "predict_proba",
                        return_value=np.array([[0.99, 0.01]]),
                    ):
                        result = self.client.post(
                            "/predict",
                            json={
                                "text": "This is the best government in India.",
                                "is_url": False,
                            },
                        ).get_json()

        self.assertTrue(result["uncertain"])
        self.assertEqual(result["uncertain_reason"], "opinion_like")
        self.assertIsNone(result["prediction"])

    def test_ambiguous_text_is_uncertain_even_with_strong_model_signal(self):
        evidence = {
            "available": False,
            "provider": "NewsAPI",
            "message": "Not configured",
            "articles": [],
        }
        with patch.object(detector, "search_related_news", return_value=evidence):
            with patch.object(detector.model, "predict", return_value=np.array([1])):
                with patch.object(
                    detector.model,
                    "decision_function",
                    return_value=np.array([1.0]),
                ):
                    with patch.object(
                        detector.confidence_model,
                        "predict_proba",
                        return_value=np.array([[0.1, 0.9]]),
                    ):
                        result = self.client.post(
                            "/predict",
                            json={
                                "text": "Maybe the report is accurate after all.",
                                "is_url": False,
                            },
                        ).get_json()

        self.assertTrue(result["uncertain"])
        self.assertEqual(result["uncertain_reason"], "ambiguous")
        self.assertIsNone(result["prediction"])

    def test_text_without_recognized_features_is_uncertain(self):
        evidence = {
            "available": False,
            "provider": "NewsAPI",
            "message": "Not configured",
            "articles": [],
        }
        with patch.object(detector, "search_related_news", return_value=evidence):
            result = self.client.post(
                "/predict",
                json={"text": "??? !!! ...", "is_url": False},
            ).get_json()

        self.assertTrue(result["uncertain"])
        self.assertEqual(result["uncertain_reason"], "unrecognized_text")
        self.assertIsNone(result["prediction"])

    def test_empty_prediction_input_is_rejected(self):
        response = self.client.post("/predict", json={"text": " ", "is_url": False})
        self.assertEqual(response.status_code, 400)
        self.assertIn("empty", response.get_json()["error"].lower())

    def test_existing_history_database_gets_evidence_column(self):
        legacy_path = Path(self.temp_dir.name) / "legacy.sqlite3"
        with closing(sqlite3.connect(legacy_path)) as connection:
            with connection:
                connection.execute(
                    """
                    CREATE TABLE investigations (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        input_text TEXT NOT NULL,
                        prediction TEXT NOT NULL,
                        uncertain INTEGER NOT NULL,
                        word_count INTEGER NOT NULL,
                        article_title TEXT,
                        article_publisher TEXT,
                        article_url TEXT,
                        created_at TEXT NOT NULL
                    )
                    """
                )

        with patch.object(database, "DATABASE_PATH", legacy_path):
            database.initialize_database()

        with closing(sqlite3.connect(legacy_path)) as connection:
            columns = {
                row[1]
                for row in connection.execute("PRAGMA table_info(investigations)")
            }
        self.assertIn("evidence_json", columns)

    def test_prediction_returns_explicit_provider_status_without_key(self):
        with patch.object(detector, "NEWSAPI_KEY", ""):
            response = self.client.post(
                "/predict",
                json={"text": "A sample claim with related news search disabled.", "is_url": False},
            )
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.get_json()["evidence"]["available"])
        self.assertIn("unavailable right now", response.get_json()["evidence"]["message"])

    def test_newsapi_articles_are_bounded_and_labeled_as_related_coverage(self):
        class FakeResponse:
            def __enter__(self):
                return self

            def __exit__(self, *args):
                return False if args else None

            def read(self, limit):
                articles = [
                    {
                        "title": f"Report {index}",
                        "source": {"name": "Sample Publisher"},
                        "publishedAt": "2026-10-27T00:00:00Z",
                        "url": f"https://example.org/{index}",
                        "description": "Related reporting.",
                    }
                    for index in range(7)
                ]
                return json.dumps({"status": "ok", "articles": articles}).encode()[:limit]

        with patch.object(detector, "NEWSAPI_KEY", "test-key"):
            with patch.object(detector, "urlopen", return_value=FakeResponse()):
                result = detector.search_related_news("test claim")

        self.assertTrue(result["available"])
        self.assertEqual(len(result["articles"]), 5)
        self.assertIn("not a fact-check verdict", result["message"])

    def test_private_article_url_is_rejected(self):
        response = self.client.post(
            "/predict",
            json={"text": "http://127.0.0.1/article", "is_url": True},
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("private", response.get_json()["error"].lower())

    def test_non_http_article_url_is_rejected(self):
        response = self.client.post(
            "/predict",
            json={"text": "javascript:alert(1)", "is_url": True},
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("public http", response.get_json()["error"].lower())


if __name__ == "__main__":
    unittest.main()
