import urllib.request
import json
import sys
import time

def verify_server():
    url_health = "http://localhost:3000/api/health"
    url_metrics = "http://localhost:3000/api/metrics"
    
    print("\n=== STARTING ENDPOINT VERIFICATION ===")
    
    # 1. Test Health Endpoint
    print(f"\n[1] Fetching health check from: {url_health}")
    try:
        req = urllib.request.Request(url_health)
        with urllib.request.urlopen(req, timeout=10) as response:
            status_code = response.status
            body = response.read().decode("utf-8")
            headers = dict(response.info())
            
            print(f"HTTP Status: {status_code}")
            print(f"Response Body:\n{json.dumps(json.loads(body), indent=2)}")
            
            # Verify Security Headers
            print("\n[2] Verifying Security Headers:")
            required_headers = {
                "Content-Security-Policy": "CSP",
                "Strict-Transport-Security": "HSTS",
                "X-Frame-Options": "X-Frame-Options",
                "Referrer-Policy": "Referrer-Policy",
                "X-Content-Type-Options": "X-Content-Type-Options",
                "X-Request-Id": "Request correlation ID",
                "X-Correlation-Id": "Correlation ID"
            }
            
            failed_headers = []
            for h, desc in required_headers.items():
                val = headers.get(h.lower()) or headers.get(h)
                if val:
                    print(f"  [PASS] {h}: {val[:60]}...")
                else:
                    print(f"  [FAIL] MISSING {h} ({desc})")
                    failed_headers.append(h)
            
            if failed_headers:
                print(f"Failed security headers check. Missing: {failed_headers}")
                sys.exit(1)
            else:
                print("[PASS] All security and tracking headers are present!")

    except Exception as e:
        print(f"[FAIL] Failed to reach health endpoint: {e}")
        sys.exit(1)

    # 2. Test Metrics Endpoint
    print(f"\n[3] Fetching metrics from: {url_metrics}")
    try:
        req = urllib.request.Request(url_metrics)
        with urllib.request.urlopen(req, timeout=10) as response:
            status_code = response.status
            body = response.read().decode("utf-8")
            
            print(f"HTTP Status: {status_code}")
            print(f"Metrics Output (first 5 lines):\n" + "\n".join(body.splitlines()[:5]))
            
            if "devbrain_cache_hits_total" in body:
                print("[PASS] Prometheus metrics verified!")
            else:
                print("[FAIL] Expected metrics are missing.")
                sys.exit(1)
                
    except Exception as e:
        print(f"[FAIL] Failed to reach metrics endpoint: {e}")
        sys.exit(1)

    print("\n=== ALL ENDPOINTS VERIFIED: 100% SUCCESS ===")

if __name__ == "__main__":
    verify_server()
