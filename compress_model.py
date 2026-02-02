import joblib
import json
import numpy as np
import os

def compress_artifacts():
    print("Loading artifacts...")
    # Fix paths
    base_path = "scoring_utils"
    model_path = os.path.join(base_path, "xgb_model.joblib")
    vectorizer_path = os.path.join(base_path, "tfidf_vectorizer.joblib")
    
    model = joblib.load(model_path)
    vectorizer = joblib.load(vectorizer_path)
    
    # 1. Extract TF-IDF Helpers
    print("Extracting TF-IDF...")
    vocab = vectorizer.vocabulary_
    idf = vectorizer.idf_.tolist()
    
    # 2. Extract XGBoost Trees
    print("Extracting XGBoost...")
    booster = model.get_booster()
    # Dump model to JSON string
    model_json_str = booster.save_config() 
    # Actually, save_config gives params. We need the trees.
    # use dump_model with dump_format='json'
    
    # We need a temp file for dump_model if dump_format='json' is not returning string directly in all versions
    # But usually `booster.get_dump(dump_format='json')` returns a list of strings (one per tree).
    trees_dump = booster.get_dump(dump_format='json')
    
    # Parse each tree JSON
    trees_json = [json.loads(tree) for tree in trees_dump]
    
    class NumpyEncoder(json.JSONEncoder):
        def default(self, obj):
            if isinstance(obj, np.integer):
                return int(obj)
            if isinstance(obj, np.floating):
                return float(obj)
            if isinstance(obj, np.ndarray):
                return obj.tolist()
            return super(NumpyEncoder, self).default(obj)
            
    payload = {
        "tfidf": {
            "vocab": vocab,
            "idf": idf,
            "norm": vectorizer.norm
        },
        "xgb": {
            "trees": trees_json,
            "objective": "binary:logistic",
            "base_score": 0.5
        }
    }
    
    output_path = os.path.join(base_path, "model_lite.json")
    with open(output_path, "w", encoding='utf-8') as f:
        json.dump(payload, f, ensure_ascii=False, cls=NumpyEncoder)
        
    print(f"Compressed model saved to {output_path}")
    print(f"Size: {os.path.getsize(output_path) / 1024:.2f} KB")

if __name__ == "__main__":
    compress_artifacts()
