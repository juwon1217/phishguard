import json
import pandas as pd
import zipfile
import os
import glob

# 1. 사용자가 제공한 경로 리스트 (경로 문자열 앞에 r을 붙여 윈도우 경로 오류 방지)
target_dirs = [
    r"C:\Hyunsuk\DACON_2026_01-21\scoring_system\020.주제별 텍스트 일상 대화 데이터\01.데이터\1.Training\라벨링데이터",
    r"C:\Hyunsuk\DACON_2026_01-21\scoring_system\020.주제별 텍스트 일상 대화 데이터\01.데이터\1.Training\라벨링데이터_250929_add",
    r"C:\Hyunsuk\DACON_2026_01-21\scoring_system\020.주제별 텍스트 일상 대화 데이터\01.데이터\1.Training\원천데이터"
]

# 피싱 탐지 학습에 도움될 만한 주제 필터 (필요시 수정/추가)
#target_topics = ['상거래(쇼핑)', '금융/대출', '식음료', '가족/지인', '주거와 생활']
target_topics = None  # 주제 상관없이 다 뽑으려면 이 줄의 주석을 해제하고 위 줄을 주석 처리

def process_zip_files(directory_paths):
    all_data = []
    
    for dir_path in directory_paths:
        # 해당 폴더 내의 모든 .zip 파일 찾기
        zip_files = glob.glob(os.path.join(dir_path, "*.zip"))
        print(f"\n📂 경로 탐색 중: {dir_path}")
        print(f"   -> {len(zip_files)}개의 ZIP 파일 발견")

        for zip_path in zip_files:
            try:
                # 압축 파일 열기 (풀지 않고 읽기 모드)
                with zipfile.ZipFile(zip_path, 'r') as z:
                    # 압축 파일 내부의 파일 목록 확인
                    for filename in z.namelist():
                        # .json 파일만 타겟팅
                        if not filename.endswith('.json'):
                            continue
                        
                        # JSON 파일 열기
                        with z.open(filename) as f:
                            try:
                                # 바이트 데이터를 읽어 JSON 로드
                                data = json.load(f)
                                
                                # --- 파싱 로직 (아까 분석한 구조 적용) ---
                                for document in data.get('info', []):
                                    annotations = document.get('annotations', {})
                                    subject = annotations.get('subject', '') # 주제
                                    
                                    # 주제 필터링 (설정된 경우만)
                                    if target_topics and subject not in target_topics:
                                        continue
                                    
                                    # 대화 내용 추출
                                    for line in annotations.get('lines', []):
                                        text = line.get('norm_text', '') # 교정된 텍스트
                                        
                                        if len(text) < 2: continue # 너무 짧은 것 제외

                                        all_data.append({
                                            'text': text,
                                            'label': 0,        # 정상 데이터
                                            'category': subject
                                        })
                                        
                            except json.JSONDecodeError:
                                print(f"   ⚠️ JSON 디코딩 에러: {filename} in {zip_path}")
                            except Exception as e:
                                pass # 내부 구조가 다른 파일은 패스
                                
            except Exception as e:
                print(f"   ❌ ZIP 파일 읽기 실패: {zip_path} - {e}")
                
    return pd.DataFrame(all_data)

# --- 실행 ---
print("데이터 추출을 시작합니다... (용량이 크면 시간이 좀 걸립니다)")
df = process_zip_files(target_dirs)

if not df.empty:
    print("\n✅ [완료] 데이터 추출 성공!")
    print(f"총 데이터 개수: {len(df)}")
    print("\n[주제별 분포 확인]")
    print(df['category'].value_counts())
    
    # 결과 저장
    save_path = "normal_data_from_zip_train.csv"
    df.to_csv(save_path, index=False, encoding='utf-8-sig')
    print(f"\n💾 '{save_path}' 파일로 저장되었습니다.")
else:
    print("\n❌ 데이터를 찾지 못했습니다. 경로에 .zip 파일이 있는지, 내부에 .json이 있는지 확인해주세요.")