// Firebase Functions
const functions = require("firebase-functions");
const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");

// ✅ api.json 불러오기
const apiConfigPath = path.join(__dirname, "api.json");
const apiConfig = JSON.parse(fs.readFileSync(apiConfigPath, "utf8"));
const { API_KEY, BASE_URL, DEFAULT_PARAMS } = apiConfig.KEPCO;

// ✅ Firebase HTTPS 함수
exports.getPowerData = functions.https.onRequest(async (req, res) => {
  try {
    // ✅ CORS 설정
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    // ✅ Preflight 요청 처리
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    // ✅ 쿼리값 받기 (없으면 기본값 적용)
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = String(now.getMonth() + 1).padStart(2, "0");
    const defaultStart = `${currentYear - 1}-${currentMonth}`;
    const defaultEnd = `${currentYear}-${currentMonth}`;

    const start = req.query.stDt || defaultStart;
    const end = req.query.edDt || defaultEnd;

    // ✅ api.json의 기본 파라미터 병합
    const params = new URLSearchParams({
      serviceKey: API_KEY,
      pageNo: DEFAULT_PARAMS.pageNo,
      numOfRows: DEFAULT_PARAMS.numOfRows,
      _type: DEFAULT_PARAMS._type,
      stDt: start,
      edDt: end
    });

    const fullUrl = `${BASE_URL}?${params.toString()}`;
    console.log("🔗 호출 URL:", fullUrl);

    // ✅ KEPCO API 요청
    const response = await fetch(fullUrl);
    const data = await response.json();

    // ✅ 응답 반환
    res.status(200).json(data);

  } catch (error) {
    console.error("🚨 API 호출 실패:", error);
    res.status(500).json({ error: "API 호출 실패", details: error.message });
  }
});
