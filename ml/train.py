"""
ML Training Script — Random Forest Regressor for Traffic Delay Prediction
Run: python ml/train.py

Input:  data/traffic_prediction_dataset.xlsx
Output: ml/model.pkl, ml/label_encoders.pkl
"""

import os
import sys
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE_DIR    = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_FILE   = os.path.join(BASE_DIR, 'data', 'traffic_prediction_dataset.xlsx')
MODEL_FILE  = os.path.join(BASE_DIR, 'ml', 'model.pkl')
ENCODER_FILE= os.path.join(BASE_DIR, 'ml', 'label_encoders.pkl')

# ── Feature columns (must match ML service input) ─────────────────────────────
FEATURE_COLS = [
    'dayOfWeek',
    'hour',
    'month',
    'holiday',
    'weather',
    'googleETA_min',
    'distance_km',
    'junctionCount',
    'majorJunctionCount',
    'totalCongestionWeight',
]
TARGET_COL = 'actualDelay_min'

# Categorical columns that need encoding
CATEGORICAL_COLS = ['dayOfWeek', 'holiday', 'weather']


def load_and_preprocess(filepath):
    print(f"📂 Loading dataset: {filepath}")
    df = pd.read_excel(filepath)

    print(f"   → {len(df)} rows, {len(df.columns)} columns")
    print(f"   → Columns: {list(df.columns)}")

    # Validate required columns
    missing = [c for c in FEATURE_COLS + [TARGET_COL] if c not in df.columns]
    if missing:
        print(f"❌ Missing columns: {missing}")
        sys.exit(1)

    df = df[FEATURE_COLS + [TARGET_COL]].dropna()
    print(f"   → {len(df)} rows after dropping nulls")
    return df


def encode_features(df):
    """Label-encode categorical columns. Returns encoded df and encoders dict."""
    encoders = {}
    df_enc = df.copy()

    for col in CATEGORICAL_COLS:
        le = LabelEncoder()
        df_enc[col] = le.fit_transform(df_enc[col].astype(str))
        encoders[col] = le
        print(f"   Encoded '{col}': {list(le.classes_)}")

    return df_enc, encoders


def train():
    print("\n🚀 Starting ML Training Pipeline\n" + "─" * 45)

    # ── Load & Preprocess ─────────────────────────────────────────────────────
    df = load_and_preprocess(DATA_FILE)

    # ── Encode Categorical Features ───────────────────────────────────────────
    print("\n🔢 Encoding categorical features...")
    df_enc, encoders = encode_features(df)

    X = df_enc[FEATURE_COLS].values
    y = df_enc[TARGET_COL].values

    # ── Train / Test Split ────────────────────────────────────────────────────
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    print(f"\n📊 Train size: {len(X_train)} | Test size: {len(X_test)}")

    # ── Train Random Forest ───────────────────────────────────────────────────
    print("\n🌲 Training RandomForestRegressor (n_estimators=200)...")
    model = RandomForestRegressor(
        n_estimators=200,
        max_depth=None,
        min_samples_split=2,
        min_samples_leaf=1,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)
    print("   ✅ Training complete")

    # ── Evaluate ──────────────────────────────────────────────────────────────
    y_pred = model.predict(X_test)
    mae    = mean_absolute_error(y_test, y_pred)
    rmse   = np.sqrt(mean_squared_error(y_test, y_pred))
    r2     = r2_score(y_test, y_pred)

    print(f"\n📈 Model Evaluation:")
    print(f"   MAE  (Mean Absolute Error):  {mae:.3f} minutes")
    print(f"   RMSE (Root Mean Sq. Error):  {rmse:.3f} minutes")
    print(f"   R²   (Coefficient of Det.):  {r2:.4f}")

    # ── Feature Importance ────────────────────────────────────────────────────
    importances = model.feature_importances_
    feat_imp = sorted(zip(FEATURE_COLS, importances), key=lambda x: -x[1])
    print(f"\n🔍 Feature Importances:")
    for feat, imp in feat_imp:
        bar = "█" * int(imp * 40)
        print(f"   {feat:<25} {bar} {imp:.4f}")

    # ── Save Model & Encoders ─────────────────────────────────────────────────
    joblib.dump(model,    MODEL_FILE)
    joblib.dump(encoders, ENCODER_FILE)

    print(f"\n✅ Model saved   → {MODEL_FILE}")
    print(f"✅ Encoders saved → {ENCODER_FILE}")
    print("\n" + "─" * 45)
    print("🎉 Training complete! Run predict_api.py to start the prediction server.")


if __name__ == '__main__':
    train()
