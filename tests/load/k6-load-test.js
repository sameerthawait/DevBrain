import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  scenarios: {
    constant_load: {
      executor: "constant-vus",
      vus: 10,
      duration: "30s",
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<500"], // 95% of requests must complete under 500ms
    http_req_failed: ["rate<0.01"],   // Error rate must be less than 1%
  },
};

export default function k6LoadTest() {
  // Define endpoint calls
  const baseUrl = "http://localhost:3000";
  const sessionToken = "chat_test_auth_token_789";

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${sessionToken}`,
  };

  // 1. Test Ingestion/Search endpoint
  const searchRes = http.get(`${baseUrl}/api/search?query=HNSW`, { headers });
  check(searchRes, {
    "search status is 200": (r) => r.status === 200,
    "search transaction time ok": (r) => r.timings.duration < 500,
  });

  sleep(1);

  // 2. Test Ingestion/Chat endpoint
  const chatPayload = JSON.stringify({ query: "Explain why we choose HNSW index" });
  const chatRes = http.post(`${baseUrl}/api/chat`, chatPayload, { headers });
  check(chatRes, {
    "chat status is 200": (r) => r.status === 200,
    "chat streaming latency ok": (r) => r.timings.duration < 2000,
  });

  sleep(1);
}
