// Firebase Functions에서 외부 API 불러오기
const functions = require("firebase-functions");
const fetch = require("node-fetch");

// KEPCO 발전량 API Key
const API_KEY = "2ea671893271f4e1752c6a258014c54339c040da9783555cff1014fdf0cc1716";

// HTTPS 요청 처리 함수
exports.getPowerData = functions.https.onRequest(async (req, res) => {
  // 요청 파라미터 (기간)
  const start = req.query.stDt || "2025-01";
  const end = req.query.edDt || "2025-02";

  // KEPCO API URL
  const url = `http://apis.data.go.kr/B500001/electric/elcpPerformance/elcpPerformancelist?serviceKey=${API_KEY}&pageNo=1&numOfRows=10&stDt=${start}&edDt=${end}&_type=json`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    // CORS 허용 (웹페이지에서 호출 가능하게)
    res.set("Access-Control-Allow-Origin", "*");

    // 데이터 응답
    res.json(data);
  } catch (error) {
    console.error("API 호출 실패:", error);
    res.status(500).json({ error: "API 호출 실패" });
  }
});
