"""
NER SmartLogix — Route Risk Model Training Script

USAGE:
    cd ml
    python training/train.py

REQUIREMENTS:
    Dataset CSV at: ml/training/data/route_risk_dataset.csv
    See training/data/dataset_format.md for the expected format.
"""
import os
import sys
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.preprocessing import LabelEncoder
import joblib

DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "route_risk_dataset.csv")
MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "model", "saved")
MODEL_PATH = os.path.join(MODEL_DIR, "risk_model.pkl")

FEATURE_COLUMNS = [
    "rainfall_mm",
    "flood_index",
    "alert_count_on_route",
    "active_landslide_alerts",
    "road_disruption_count",
    "historical_risk_score",
    "vehicle_type_weight"
]
LABEL_COLUMN = "risk_level"
CLASS_ORDER = ["LOW", "MEDIUM", "HIGH"]


def load_data():
    if not os.path.exists(DATA_PATH):
        print(f"[Training] Dataset not found at: {DATA_PATH}")
        print("[Training] See training/data/dataset_format.md for how to create the dataset.")
        sys.exit(1)

    df = pd.read_csv(DATA_PATH)
    print(f"[Training] Loaded {len(df)} records.")

    missing = [c for c in FEATURE_COLUMNS + [LABEL_COLUMN] if c not in df.columns]
    if missing:
        print(f"[Training] ERROR: Missing columns: {missing}")
        sys.exit(1)

    df[LABEL_COLUMN] = df[LABEL_COLUMN].str.upper().str.strip()
    invalid = df[~df[LABEL_COLUMN].isin(CLASS_ORDER)]
    if len(invalid) > 0:
        print(f"[Training] Warning: {len(invalid)} rows with invalid labels dropped.")
        df = df[df[LABEL_COLUMN].isin(CLASS_ORDER)]

    print(f"[Training] Risk distribution:")
    print(df[LABEL_COLUMN].value_counts())
    return df


def train():
    print("[Training] Starting NER SmartLogix route risk model training...")
    df = load_data()

    le = LabelEncoder()
    le.classes_ = np.array(CLASS_ORDER)
    y = le.transform(df[LABEL_COLUMN])
    X = df[FEATURE_COLUMNS].fillna(0).values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=10,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42,
        class_weight="balanced",
        n_jobs=-1
    )

    print(f"[Training] Training on {len(X_train)} samples...")
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    print("\n[Training] === Classification Report ===")
    print(classification_report(y_test, y_pred, target_names=CLASS_ORDER))

    print("[Training] === Confusion Matrix ===")
    print(confusion_matrix(y_test, y_pred))

    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(model, X, y, cv=skf)
    print(f"\n[Training] Cross-validation accuracy: {cv_scores.mean():.3f} (+/- {cv_scores.std():.3f})")

    print("\n[Training] Feature importances:")
    for feat, imp in sorted(zip(FEATURE_COLUMNS, model.feature_importances_), key=lambda x: -x[1]):
        print(f"  {feat:<30} {imp:.4f}")

    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    print(f"\n[Training] Model saved to: {MODEL_PATH}")
    print("[Training] Restart the ML service (uvicorn) to load the new model.")


if __name__ == "__main__":
    train()
