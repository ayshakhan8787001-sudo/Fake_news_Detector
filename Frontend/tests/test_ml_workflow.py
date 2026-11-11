import io
import unittest
from contextlib import redirect_stdout

import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split

from make_dataset import prepare_dataset
from train_model import evaluate


class DatasetPreparationTests(unittest.TestCase):
    def test_prepare_dataset_uses_all_eligible_rows_when_sample_size_is_unset(self):
        source = pd.DataFrame(
            [
                {"Statement": "True claim one", "Label": "true", "Web": "NEWS"},
                {"Statement": "True claim two", "Label": "true", "Web": "NEWS"},
                {"Statement": "True claim three", "Label": "true", "Web": "NEWS"},
                {"Statement": "Fake claim one", "Label": "fake", "Web": "NEWS"},
                {"Statement": "Fake claim two", "Label": "fake", "Web": "NEWS"},
                {"Statement": "Augmented fake", "Label": "fake", "Web": "AUGMENT"},
            ]
        )

        with redirect_stdout(io.StringIO()):
            result = prepare_dataset(source, sample_size=None)

        self.assertEqual(len(result), 4)
        self.assertEqual(result["Label"].value_counts().to_dict(), {"true": 2, "fake": 2})
        self.assertFalse(result["Web"].str.casefold().eq("augment").any())

    def test_prepare_dataset_removes_invalid_conflicting_and_duplicate_rows(self):
        source = pd.DataFrame(
            [
                {"Statement": "  True   report ", "Label": "TRUE", "Source": "A"},
                {"Statement": "true report", "Label": "true", "Source": "Duplicate"},
                {"Statement": "Fake report", "Label": "fake", "Source": "B"},
                {"Statement": "Conflicting claim", "Label": "true", "Source": "C"},
                {"Statement": " conflicting   claim ", "Label": "fake", "Source": "D"},
                {"Statement": "   ", "Label": "true", "Source": "Empty"},
                {"Statement": "Unknown label", "Label": "unknown", "Source": "Invalid"},
            ]
        )

        with redirect_stdout(io.StringIO()):
            result = prepare_dataset(source, sample_size=1)

        self.assertEqual(len(result), 2)
        self.assertEqual(result["Label"].value_counts().to_dict(), {"true": 1, "fake": 1})
        self.assertNotIn("_normalized_statement", result.columns)
        self.assertEqual(set(result.columns), set(source.columns))
        self.assertEqual(len(source), 7)

    def test_prepare_dataset_uses_largest_balanced_sample_when_target_unavailable(self):
        source = pd.DataFrame(
            [
                {"Statement": "One true example", "Label": "true"},
                {"Statement": "One fake example", "Label": "fake"},
            ]
        )

        with redirect_stdout(io.StringIO()) as output:
            result = prepare_dataset(source, sample_size=2)

        self.assertEqual(len(result), 2)
        self.assertEqual(result["Label"].value_counts().to_dict(), {"true": 1, "fake": 1})
        self.assertIn("creating an equally sized sample", output.getvalue())

    def test_prepare_dataset_rejects_a_missing_class(self):
        source = pd.DataFrame(
            [{"Statement": "Only true example", "Label": "true"}]
        )

        with redirect_stdout(io.StringIO()):
            with self.assertRaisesRegex(ValueError, "one or both classes have no"):
                prepare_dataset(source, sample_size=1)

    def test_prepare_dataset_excludes_augment_rows_without_mutating_source(self):
        source = pd.DataFrame(
            [
                {"Statement": "True claim one", "Label": "true", "Web": "NEWS"},
                {"Statement": "True claim two", "Label": "true", "Web": "NEWS"},
                {"Statement": "Fake claim one", "Label": "fake", "Web": "NEWS"},
                {"Statement": "Fake claim two", "Label": "fake", "Web": "NEWS"},
                {"Statement": "Augmented fake one", "Label": "fake", "Web": "AUGMENT"},
                {"Statement": "Augmented fake two", "Label": "fake", "Web": "AUGMENT"},
            ]
        )

        with redirect_stdout(io.StringIO()):
            result = prepare_dataset(source, sample_size=2)

        self.assertEqual(len(source), 6)
        self.assertEqual(len(result), 4)
        self.assertEqual(result["Label"].str.casefold().value_counts().to_dict(), {"true": 2, "fake": 2})
        self.assertFalse(result["Web"].str.casefold().eq("augment").any())


class ModelEvaluationTests(unittest.TestCase):
    def test_evaluate_reports_metrics_for_both_linear_classifiers(self):
        statements = pd.Series(
            [
                "fake claim report",
                "fake claim story",
                "fake claim detail",
                "fake claim update",
                "real official report",
                "real official story",
                "real official detail",
                "real official update",
            ]
        )
        labels = pd.Series([0, 0, 0, 0, 1, 1, 1, 1])
        train_indices, test_indices = train_test_split(
            list(range(len(statements))),
            test_size=0.25,
            random_state=42,
            stratify=labels,
        )

        for classifier, name in (
            (None, "LinearSVC"),
            (LogisticRegression(max_iter=1000, random_state=42), "Logistic Regression"),
        ):
            output = io.StringIO()
            with redirect_stdout(output):
                evaluate(
                    name,
                    train_indices,
                    test_indices,
                    statements,
                    labels,
                    classifier=classifier,
                )

            self.assertIn("precision", output.getvalue())
            self.assertIn("Confusion matrix", output.getvalue())


if __name__ == "__main__":
    unittest.main()
