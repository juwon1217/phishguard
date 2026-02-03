import sys
import os

# Ensure we can import from current directory
sys.path.append(os.getcwd())

try:
    from scoring_utils.user_inference import predict_user_leakage
except ImportError as e:
    print(f"Import Error: {e}")
    print("Please run this script from the project root directory (dacon - 복사본).")
    print("Example: python test_user_leak_lite.py")
    sys.exit(1)

def test_loop():
    print("=== User Leakage Detector (Lite Model) Tester ===")
    print("Type a message to check its Leakage Risk Score.")
    print("Examples:")
    print("  - 'My password is 1234' (Should be High Risk)")
    print("  - 'Who are you?' (Should be 0 Risk)")
    print("Type 'exit' to quit.\n")
    
    while True:
        try:
            user_input = input("User Message > ")
            if user_input.lower() in ['exit', 'quit']:
                break
            
            # Predict
            # Returns: prob_percent (0-100), details (dict)
            score, details = predict_user_leakage(user_input)
            
            print(f"\n[Analysis Result]")
            print(f"Leakage Score: {score:.1f}%")
            print(f"Features: {details}")
            
            if score > 50:
                print("🚨 DANGER: Sensitive Info Leaked!")
            else:
                print("✅ SAFE: No Leak Detected.")
            print("-" * 30 + "\n")
                
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    test_loop()
