import joblib
import json
import numpy as np

def compress_user_model():
    print("Loading models...")
    rf_model = joblib.load("leakage_analysis/user_leak_model.joblib")
    vectorizer = joblib.load("leakage_analysis/user_tfidf.joblib")
    
    # 1. Compress TF-IDF
    print("Compressing TF-IDF...")
    tfidf_data = {
        "vocab": {k: int(v) for k, v in vectorizer.vocabulary_.items()},
        "idf": vectorizer.idf_.tolist(),
        "norm": vectorizer.norm
    }
    
    # 2. Compress Random Forest
    print("Compressing Random Forest...")
    trees_data = []
    
    for estimator in rf_model.estimators_:
        tree = estimator.tree_
        # Extract tree structure
        # tree.children_left, tree.children_right, tree.feature, tree.threshold, tree.value
        # We need to traverse and build a dict
        
        def recurse(node_id):
            if tree.children_left[node_id] == -1: # Leaf
                # Value is [ [count_class0, count_class1] ]
                # We want prob of class 1. But RF averages votes. 
                # Scikit RF leaves storeCOUNTS.
                # But actually, RF just votes. 
                # Actually, standard RF averages the PROBABILITIES of the trees.
                # Sklearn RF: `predict_proba` averages the class probabilities of the trees.
                # Each tree outputs a probability (fraction of samples in leaf).
                vals = tree.value[node_id][0]
                prob_1 = vals[1] / sum(vals)
                return {"leaf": float(prob_1)}
            else:
                return {
                    "split_feature": int(tree.feature[node_id]),
                    "threshold": float(tree.threshold[node_id]),
                    "left": recurse(tree.children_left[node_id]),
                    "right": recurse(tree.children_right[node_id])
                }
        
        trees_data.append(recurse(0))
        
    lite_model = {
        "tfidf": tfidf_data,
        "rf_trees": trees_data
    }
    
    # 3. Save
    out_path = "scoring_utils/user_model_lite.json"
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(lite_model, f, ensure_ascii=False)
        
    print(f"Saved compressed model to {out_path}")
    import os
    print(f"Size: {os.path.getsize(out_path)/1024:.2f} KB")

if __name__ == "__main__":
    compress_user_model()
