import xgboost as xgb
from config import XGB_PARAMS

def build_model(scale_pos_weight=1.0):
    """
    config.py에 있는 설정대로 모델을 조립하여 반환합니다.
    데이터 불균형 비율(scale_pos_weight)만 그때그때 받습니다.
    """
    model = xgb.XGBClassifier(
        **XGB_PARAMS,
        scale_pos_weight=scale_pos_weight
    )
    return model