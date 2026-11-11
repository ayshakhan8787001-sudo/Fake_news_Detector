import re
import unicodedata

import pandas as pd


def normalize_statement(value):
    """Normalize Unicode, whitespace, and case for duplicate detection."""
    if pd.isna(value):
        return ""
    text = unicodedata.normalize("NFKC", str(value))
    return re.sub(r"\s+", " ", text).strip().casefold()


def prepare_dataset(data, sample_size=None, random_state=42):
    """Clean, deduplicate, and create a reproducible balanced dataset."""
    required = {"Statement", "Label"}
    missing = required.difference(data.columns)
    if missing:
        raise ValueError(f"Dataset missing required columns: {sorted(missing)}")

    data = data.copy()
    if "Web" in data.columns:
        is_augment = data["Web"].fillna("").astype(str).str.strip().str.casefold().eq("augment")
        print("AUGMENT rows excluded:", int(is_augment.sum()))
        data = data.loc[~is_augment].copy()

    data["Label"] = data["Label"].astype(str).str.strip().str.casefold()
    data = data[data["Label"].isin(["true", "fake"])].copy()
    print("\nAfter removing invalid labels:")
    print(data["Label"].value_counts())

    data["Statement"] = data["Statement"].fillna("").astype(str).str.strip()
    data["_normalized_statement"] = data["Statement"].map(normalize_statement)
    data = data[data["_normalized_statement"] != ""].copy()

    label_counts = data.groupby("_normalized_statement", sort=False)["Label"].nunique()
    conflicting_statements = set(label_counts[label_counts > 1].index)
    conflict_rows = int(data["_normalized_statement"].isin(conflicting_statements).sum())
    print("\nConflicting normalized duplicate groups:", len(conflicting_statements))
    print("Rows removed from conflicting groups:", conflict_rows)
    data = data[~data["_normalized_statement"].isin(conflicting_statements)].copy()

    duplicate_rows = int(data.duplicated(subset=["_normalized_statement"], keep="first").sum())
    data = data.drop_duplicates(subset=["_normalized_statement"], keep="first").copy()
    print("Same-label normalized duplicate rows removed:", duplicate_rows)
    print("Rows remaining after normalization/deduplication:", len(data))

    true_data = data[data["Label"] == "true"]
    fake_data = data[data["Label"] == "fake"]
    print("\nAvailable records after conflict removal and deduplication:")
    print("TRUE:", len(true_data))
    print("FAKE:", len(fake_data))

    if sample_size is not None and sample_size <= 0:
        raise ValueError("sample_size must be greater than zero.")
    available_balanced_count = min(len(true_data), len(fake_data))
    sample_count = (
        available_balanced_count
        if sample_size is None
        else min(sample_size, available_balanced_count)
    )
    if sample_count == 0:
        raise ValueError(
            "Cannot create a balanced sample because one or both classes have no "
            f"eligible records: TRUE={len(true_data)}, FAKE={len(fake_data)}."
        )
    if sample_size is not None and sample_count < sample_size:
        print(
            f"Only {sample_count} eligible records are available in the smaller "
            "class; creating an equally sized sample from both classes."
        )

    true_sample = true_data.sample(n=sample_count, random_state=random_state)
    fake_sample = fake_data.sample(n=sample_count, random_state=random_state)
    balanced_data = pd.concat([true_sample, fake_sample], ignore_index=True)
    balanced_data = balanced_data.sample(frac=1, random_state=random_state).reset_index(drop=True)
    return balanced_data.drop(columns=["_normalized_statement"])


def main():
    data = pd.read_csv("IFND.csv")
    print("Original dataset loaded!")
    print("Total records:", len(data))

    balanced_data = prepare_dataset(data)
    output_path = "IFND_balanced_clean.csv"
    balanced_data.to_csv(output_path, index=False)
    print("\n==============================")
    print("DATASET CREATED SUCCESSFULLY")
    print("==============================")
    print("Total records:", len(balanced_data))
    print("\nFinal distribution:")
    print(balanced_data["Label"].value_counts())
    print(f"\nFile created: {output_path}")


if __name__ == "__main__":
    main()
