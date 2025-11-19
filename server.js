const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');
const axios = require('axios');
const xml2js = require('xml2js');

const app = express();
// Middleware 설정
app.use(bodyParser.json());
app.use(cors());

// 정적 파일 제공 설정
app.use(express.static('.')); 

// PostgreSQL 연결 설정
const pool = new Pool({
  user: 'postgres',
  host: "116.122.157.223",
  database: 'postgres',
  password: '1',
  port: 5432
});

// DB 연결 테스트
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('⚠️ PostgreSQL 연결 실패:', err.stack);
    } else {
        console.log('✅ PostgreSQL DB 연결 성공!');
    }
});

// ===== 회원가입 API =====
app.post('/signup', async (req, res) => {
  const { user_id, nick_name, email, password } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO member (user_id, nick_name, pass, email, score, admin_flag)
       VALUES ($1, $2, $3, $4, 0, false)
       RETURNING user_id`,
      [user_id, nick_name, password, email]
    );
    res.json({ success: true, message: '회원가입 완료!', user: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') { 
        res.status(409).json({ success: false, message: '회원가입 실패: 이미 존재하는 사용자 ID 또는 이메일입니다.' });
    } else {
        console.error('회원가입 서버 오류:', err);
        res.status(500).json({ success: false, message: '회원가입 실패: 서버 오류' });
    }
  }
});

// ===== 로그인 API =====
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query(
      `SELECT user_id, nick_name, email, score, admin_flag
       FROM member
       WHERE email=$1 AND pass=$2`,
      [email, password]
    );
    if (result.rows.length > 0) {
      res.json({ success: true, message: '로그인 성공!', user: result.rows[0] });
    } else {
      res.status(401).json({ success: false, message: '이메일 또는 비밀번호가 틀렸습니다.' });
    }
  } catch (err) {
    console.error('로그인 서버 오류:', err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ===== Education 데이터 조회 API =====
app.get('/api/education', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM public.education ORDER BY id ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("❌ education 데이터 조회 실패:", err);
    res.status(500).json({ error: 'Database error' });
  }
});

// ===== 점수 업데이트 API =====
app.post('/update-score', async (req, res) => {
  const { user_id, score } = req.body;
  if (!user_id || score === undefined) {
    return res.status(400).json({ success: false, message: 'user_id 또는 score 누락' });
  }

  try {
    const query = `
      UPDATE member
      SET score = COALESCE(score, 0) + $1
      WHERE user_id = $2
      RETURNING score
    `;
    const values = [score, user_id];
    const result = await pool.query(query, values);

    if (result.rows.length > 0) {
      res.json({ success: true, newScore: result.rows[0].score });
    } else {
      res.status(404).json({ success: false, message: '해당 유저를 찾을 수 없습니다.' });
    }
  } catch (err) {
    console.error('점수 업데이트 서버 오류:', err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// ===== 점수 조회 API =====
app.get('/get-score', async (req, res) => {
  const user_id = req.query.user_id;
  if (!user_id)
    return res.status(400).json({ success: false, message: 'user_id 누락' });

  try {
    const result = await pool.query('SELECT score FROM member WHERE user_id=$1', [user_id]);
    if (result.rows.length > 0) {
      res.json({ success: true, score: result.rows[0].score });
    } else {
      res.status(404).json({ success: false, message: '해당 유저 없음' });
    }
  } catch (err) {
    console.error('점수 조회 서버 오류:', err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// ===== 모든 발전소 조회 =====
app.get('/api/plants', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT plant_id, plant_name, plant_type, capacity, latitude, longitude, adress, business, remark
      FROM public.power_plant
      WHERE latitude IS NOT NULL 
      AND longitude IS NOT NULL
    `);

    console.log('\n🔍 [/api/plants] 조회 결과:');
    console.log(`총 ${result.rows.length}개 발전소`);
    console.log('📋 샘플 데이터 (첫 5개):');
    result.rows.slice(0, 5).forEach((row, idx) => {
      console.log(`${idx + 1}. 이름: ${row.plant_name} | 유형: ${row.plant_type} | 좌표: (${row.latitude}, ${row.longitude})`);
    });
    console.log('🔑 필드명:', Object.keys(result.rows[0] || {}));
    
    // ✅ 발전소 유형별 개수 확인
    const typeCounts = {};
    result.rows.forEach(row => {
      const type = row.plant_type || 'unknown';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });
    console.log('📊 발전소 유형별 개수:', typeCounts);

    // 원자력 발전소 호기 정보 함께 반환
    let plantUnits = {};
    try {
      const unitsResult = await pool.query(`
        SELECT DISTINCT "발전소명", "호기명"
        FROM public."원자력발전소_호기별발전량"
        ORDER BY "발전소명", "호기명"
      `);
      unitsResult.rows.forEach(row => {
        if (!plantUnits[row.발전소명]) {
          plantUnits[row.발전소명] = [];
        }
        if (!plantUnits[row.발전소명].includes(row.호기명)) {
          plantUnits[row.발전소명].push(row.호기명);
        }
      });
      // 호기 정렬 (숫자 순서대로)
      Object.keys(plantUnits).forEach(plantName => {
        plantUnits[plantName].sort((a, b) => {
          const numA = parseInt(a.match(/\d+/)?.[0] || 0);
          const numB = parseInt(b.match(/\d+/)?.[0] || 0);
          return numA - numB;
        });
      });
    } catch (err) {
      console.warn('⚠️ 호기 정보 조회 실패:', err.message);
    }

    res.json({
      plants: result.rows,
      plantUnits: plantUnits
    });
  } catch (err) {
    console.error('❌ [전체 발전소] 데이터 조회 오류:', err);
    res.status(500).json({ success: false, message: 'DB 조회 실패', error: err.message });
  }
});

// ===== 발전 데이터 조회 API (NEW) =====
app.get('/api/power-data', async (req, res) => {
  const { plant, year, hour } = req.query;
  
  if (!plant || !year || !hour) {
    return res.status(400).json({ 
      success: false, 
      message: 'plant, year, hour 파라미터가 필요합니다' 
    });
  }

  try {
    // 원자력 발전소의 경우 호기별 발전량 테이블에서 조회
    if (plant.includes('원자력') || plant.includes('고리') || plant.includes('한빛') || 
        plant.includes('한울') || plant.includes('월성')) {
      
      // 발전소명에서 호기 정보 추출 (예: "고리#1" -> 발전소: "고리", 호기: "#1")
      const plantNameMatch = plant.match(/^([가-힣]+)/);
      const unitMatch = plant.match(/#\d+/);
      
      if (!plantNameMatch) {
        return res.status(404).json({ 
          success: false, 
          message: '발전소명을 찾을 수 없습니다' 
        });
      }

      const plantName = plantNameMatch[0];
      const unitName = unitMatch ? unitMatch[0] : null;

      console.log(`\n🔍 원자력 발전소 조회: ${plantName} ${unitName} (${year}년)`);

      // 연간 발전량 데이터 조회
      const query = `
        SELECT "발전소명", "호기명", "년도", "발전량mwh"
        FROM public."원자력발전소_호기별발전량"
        WHERE "발전소명" = $1 
        ${unitName ? 'AND "호기명" = $2' : ''}
        AND "년도" = ${unitName ? '$3' : '$2'}
      `;
      
      const params = unitName ? [plantName, unitName, parseInt(year)] : [plantName, parseInt(year)];
      const result = await pool.query(query, params);

      if (result.rows.length === 0) {
        console.log('⚠️ 데이터 없음');
        return res.status(404).json({ 
          success: false, 
          message: '해당 연도의 발전 데이터가 없습니다' 
        });
      }

      // 연간 발전량을 시간당 평균 발전량으로 변환
      // 1년 = 8760시간
      const yearlyGeneration = parseFloat(result.rows[0].발전량mwh);
      const hourlyGeneration = yearlyGeneration / 8760;
      
      // 설비용량 대비 효율 계산 (임의로 설비용량을 1000MW로 가정)
      const assumedCapacity = 1000; // MW
      const efficiency = (hourlyGeneration / assumedCapacity) * 100;

      console.log(`✅ 연간 발전량: ${yearlyGeneration} MWh`);
      console.log(`✅ 시간당 평균: ${hourlyGeneration.toFixed(2)} MW`);
      console.log(`✅ 효율: ${efficiency.toFixed(2)}%`);

      return res.json({
        success: true,
        efficiency: Math.min(80, Math.max(20, efficiency)), // 20~80% 범위로 제한
        power_output: hourlyGeneration,
        source: 'database',
        year: parseInt(year),
        plant: plant
      });
    }

    // 다른 발전소 유형은 데이터 없음 처리
    return res.status(404).json({ 
      success: false, 
      message: '해당 발전소 유형의 데이터가 아직 준비되지 않았습니다' 
    });

  } catch (err) {
    console.error('❌ [발전 데이터 조회 오류]:', err);
    res.status(500).json({ 
      success: false, 
      message: 'DB 조회 실패', 
      error: err.message 
    });
  }
});

// ===== 원자력 발전소 호기별 발전량 통합 조회 =====
app.get('/api/nuclear/full', async (req, res) => {
  try {
    // 1️⃣ 발전소 위치 정보 가져오기
    const plantsResult = await pool.query(`
      SELECT * 
      FROM public.power_plant
      WHERE plant_type = '원자력'
      AND latitude IS NOT NULL 
      AND longitude IS NOT NULL
    `);

    // 2️⃣ 호기별 발전량 가져오기
    const powerResult = await pool.query(`
      SELECT "발전소명", "호기명", "년도", "발전량mwh"
      FROM public."원자력발전소_호기별발전량"
      ORDER BY "발전소명", "호기명", "년도"
    `);

    // 3️⃣ 발전소별 호기 정보 그룹화
    const groupedPower = {};
    const plantUnits = {}; // 발전소별 호기 목록

    powerResult.rows.forEach(row => {
      const plantName = row.발전소명;
      const unitName = row.호기명;

      // 발전량 데이터 그룹화
      if (!groupedPower[plantName]) {
        groupedPower[plantName] = [];
      }
      groupedPower[plantName].push({
        year: row.년도,
        unit: unitName,
        value: row.발전량mwh
      });

      // ✅ 호기 목록 추출 (중복 제거)
      if (!plantUnits[plantName]) {
        plantUnits[plantName] = [];
      }
      if (!plantUnits[plantName].includes(unitName)) {
        plantUnits[plantName].push(unitName);
      }
    });

    // ✅ 호기 정렬 (숫자 순서대로)
    Object.keys(plantUnits).forEach(plantName => {
      plantUnits[plantName].sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)?.[0] || 0);
        const numB = parseInt(b.match(/\d+/)?.[0] || 0);
        return numA - numB;
      });
    });

    console.log('\n✅ 발전소별 호기 정보:');
    Object.entries(plantUnits).forEach(([plant, units]) => {
      console.log(`   ${plant}: ${units.join(', ')}`);
    });

    // 4️⃣ 발전소 위치 + 호기정보 합치기
    const result = plantsResult.rows.map(plant => {
      const plantName = plant.plant_name;

      // 호기별 발전량 객체로 변환
      const powerByUnit = {};
      (groupedPower[plantName] || []).forEach(item => {
        if (!powerByUnit[item.unit]) {
          powerByUnit[item.unit] = [];
        }
        powerByUnit[item.unit].push({ 
          year: item.year, 
          value: item.value 
        });
      });

      // 각 호기별 데이터를 년도순으로 정렬
      Object.keys(powerByUnit).forEach(unit => {
        powerByUnit[unit].sort((a, b) => a.year - b.year);
      });

      return {
        ...plant,
        units: plantUnits[plantName] || [],
        powerData: powerByUnit
      };
    });

    console.log(`\n✅ 최종 반환 데이터: ${result.length}개 발전소`);
    result.forEach(plant => {
      console.log(`   ${plant.plant_name}: ${plant.units.length}개 호기`);
    });

    res.json(result);

  } catch (err) {
    console.error('❌ 발전소/호기 통합 조회 오류:', err);
    res.status(500).json({ 
      success: false, 
      message: 'DB 조회 실패', 
      error: err.message 
    });
  }
});

// =====  화력 발전소 호기별 일자별 시간대별 발전량 조회 API =====
app.get('/api/thermal/power', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        "호기", 
        "일자", 
        "발전시간", 
        "발전량_mwh"
      FROM public."남동발전_분당화력_시간대별발전실적"
      ORDER BY "호기", "일자", "발전시간"
    `);

    const data = {};

    result.rows.forEach(row => {
      const unit = row.호기;
      const date = row.일자;
      const hour = row.발전시간;
      const amount = Number(row.발전량_mwh);

      if (!data[unit]) data[unit] = {};         // 호기 생성
      if (!data[unit][date]) data[unit][date] = {}; // 날짜 생성

      data[unit][date][hour] = amount;          // 시간별 발전량 저장
    });

    res.json({
      success: true,
      data
    });

  } catch (err) {
    console.error('❌ [호기/일자/시간대별 발전량 조회 오류]:', err);
    res.status(500).json({
      success: false,
      message: 'DB 조회 실패',
      error: err.message
    });
  }
});

// ===== 태양광 발전소 일자별 시간대별 발전량 조회 API =====
app.get('/api/solar/power', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        "발전구분",
        "일자", 
        "발전시간", 
        "발전량_kwh"
      FROM public."남동발전_시간대별태양광발전실적"
      ORDER BY "발전구분", "일자", "발전시간"
    `);

    const data = {};

    result.rows.forEach(row => {
      const plantName = row.발전구분;  // 발전소명
      const date = row.일자;
      const hour = row.발전시간;
      const amount = Number(row.발전량_kwh);

      if (!data[plantName]) data[plantName] = {};  // 발전소 생성
      if (!data[plantName][date]) data[plantName][date] = {};  // 날짜 생성

      data[plantName][date][hour] = amount;  // 시간별 발전량 저장
    });
    
    res.json({
      success: true,
      data  // { "발전소명": { "날짜": { "시간": 발전량 } }, ... }
    });

  } catch (err) {
    console.error('❌ [태양광 일자/시간대별 발전량 조회 오류]:', err);
    res.status(500).json({
      success: false,
      message: 'DB 조회 실패',
      error: err.message
    });
  }
});

// ===== 풍력 발전소 일자별 시간대별 발전량 조회 API =====
app.get('/api/wind/power', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        "발전구분",
        "일자", 
        "발전시간", 
        "발전량_mwh"
      FROM public."남동발전_시간대별풍력발전실적"
      ORDER BY "발전구분", "일자", "발전시간"
    `);

    const data = {};

    result.rows.forEach(row => {
      const plantName = row.발전구분;  // 발전소명
      const date = row.일자;
      const hour = row.발전시간;
      const amount = Number(row.발전량_mwh);

      if (!data[plantName]) data[plantName] = {};  // 발전소 생성
      if (!data[plantName][date]) data[plantName][date] = {};  // 날짜 생성

      data[plantName][date][hour] = amount;  // 시간별 발전량 저장
    });
    
    res.json({
      success: true,
      data  // { "발전소명": { "날짜": { "시간": 발전량 } }, ... }
    });

  } catch (err) {
    console.error('❌ [풍력 일자/시간대별 발전량 조회 오류]:', err);
    res.status(500).json({
      success: false,
      message: 'DB 조회 실패',
      error: err.message
    });
  }
});

// ===== 한국수자원공사 일별 수력발전소 발전량 조회 API =====
app.get('/api/hydro/daily-power', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        "댐이름",
        "관측년월일",
        "발전량누계실적"
      FROM public."한국수자원공사_다목적댐일자별발전량"
      ORDER BY "댐이름", "관측년월일"
    `);

    const data = {};

    result.rows.forEach(row => {
      const damName = row.댐이름;
      const date = row.관측년월일;
      const amount = Number(row.발전량누계실적);

      if (!data[damName]) data[damName] = {};

      data[damName][date] = amount;
    });

    res.json({
      success: true,
      data
    });

  } catch (err) {
    console.error('❌ [수력 일별 발전량 조회 오류]:', err);
    res.status(500).json({
      success: false,
      message: 'DB 조회 실패',
      error: err.message
    });
  }
});

// ===== 한국수력원자력 수력발전소 연도별 발전량 조회 API =====
app.get('/api/hydro/khnp-yearly', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        "발전소명",
        "YEAR",
        "발전량_MW"
      FROM public."한국수력원자력_수력발전소별연도별"
      ORDER BY "발전소명", "YEAR"
    `);

    const data = {};

    result.rows.forEach(row => {
      const plantName = row.발전소명;
      const year = row.YEAR;
      const amount = Number(row.발전량_MW);

      if (!data[plantName]) data[plantName] = [];
      
      data[plantName].push({
        year: year,
        value: amount
      });
    });

    res.json({
      success: true,
      data
    });

  } catch (err) {
    console.error('❌ [한수원 수력 연도별 발전량 조회 오류]:', err);
    res.status(500).json({
      success: false,
      message: 'DB 조회 실패',
      error: err.message
    });
  }
});

// ===== 디버깅용 전체 발전소 현황 API =====
app.get('/api/debug/all-plants', async (req, res) => {
  try {
    const hydro = await pool.query('SELECT COUNT(*) FROM public."수력발전소"');
    const nuclear = await pool.query('SELECT COUNT(*) FROM public."원자력발전소현황"');
    
    res.json({
      수력발전소: hydro.rows[0].count,
      원자력발전소: nuclear.rows[0].count,
      message: '디버깅 정보'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== Alert 테이블 실시간 조회 API (5초마다 자동 갱신용) =====
app.get('/api/alerts', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        "발전종류", 
        "발전소명", 
        "경고단계"
      FROM public.alert
      ORDER BY "경고단계" DESC, id DESC
    `);
    
    console.log(`✅ [Alert API] ${result.rows.length}개 경고 데이터 조회됨`);
    
    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('❌ [Alert 조회 오류]:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Alert 데이터 조회 실패', 
      error: err.message 
    });
  }
});

// ===== Alert HTML 페이지 제공 =====
app.get('/alerts', (req, res) => {
  res.sendFile(path.join(__dirname, 'alerts.html'));
});

// ===== 서버 실행 =====
const serverPort = 3000;
app.listen(serverPort, () => {
  console.log(`\n✅ ========================================`);
  console.log(`✅ Server running on http://localhost:${serverPort}`);
  console.log(`✅ ========================================\n`);
  console.log(`📍 API 엔드포인트:`);
  console.log(`   - GET  /api/plants            (모든 발전소)`);
  console.log(`   - GET  /api/power-data        (발전 데이터 조회)`);
  console.log(`   - GET  /api/nuclear/power     (원자력 발전량)`);
  console.log(`   - GET  /api/debug/all-plants  (디버깅용)`);
  console.log(`   - POST /signup                (회원가입)`);
  console.log(`   - POST /login                 (로그인)`);
  console.log(`\n`);
});
// ===== 화력 발전소 호기별 연도별 발전량 조회 API (slide.html용) =====
app.get('/api/thermal/yearly-power', async (req, res) => {
  try {
    console.log('\n🔍 [화력] 연도별 발전량 조회 시작...');
    
    const result = await pool.query(`
      SELECT "호기", "일자", "발전시간", "발전량_mwh"
      FROM public."남동발전_분당화력_시간대별발전실적"
      ORDER BY "호기", "일자", "발전시간"
    `);

    const yearlyData = {};

    result.rows.forEach(row => {
      const unit = row.호기;
      const date = row.일자;
      const year = date.substring(0, 4);
      const amount = Number(row.발전량_mwh);

      if (!yearlyData[unit]) yearlyData[unit] = {};
      if (!yearlyData[unit][year]) yearlyData[unit][year] = 0;

      yearlyData[unit][year] += amount;
    });

    const data = {};
    Object.keys(yearlyData).forEach(unit => {
      data[unit] = [];
      Object.keys(yearlyData[unit]).forEach(year => {
        data[unit].push({
          year: parseInt(year),
          value: yearlyData[unit][year]
        });
      });
      data[unit].sort((a, b) => a.year - b.year);
    });

    console.log(`✅ [화력] ${Object.keys(data).length}개 호기 조회 완료`);

    res.json({
      success: true,
      data: data
    });

  } catch (err) {
    console.error('❌ [화력] 조회 오류:', err);
    res.status(500).json({
      success: false,
      message: 'DB 조회 실패',
      error: err.message
    });
  }
});

// ===== 태양광 발전소 연도별 발전량 조회 API (slide.html용) =====
app.get('/api/solar/yearly-power', async (req, res) => {
  try {
    console.log('\n🔍 [태양광] 연도별 발전량 조회 시작...');
    
    const result = await pool.query(`
      SELECT "발전구분", "일자", "발전시간", "발전량_kwh"
      FROM public."남동발전_시간대별태양광발전실적"
      ORDER BY "발전구분", "일자", "발전시간"
    `);

    const yearlyData = {};

    result.rows.forEach(row => {
      const plantName = row.발전구분;
      const date = row.일자;
      const year = date.substring(0, 4);
      const amount = Number(row.발전량_kwh) / 1000; // kWh -> MWh

      if (!yearlyData[plantName]) yearlyData[plantName] = {};
      if (!yearlyData[plantName][year]) yearlyData[plantName][year] = 0;

      yearlyData[plantName][year] += amount;
    });

    const data = {};
    Object.keys(yearlyData).forEach(plantName => {
      data[plantName] = [];
      Object.keys(yearlyData[plantName]).forEach(year => {
        data[plantName].push({
          year: parseInt(year),
          value: yearlyData[plantName][year]
        });
      });
      data[plantName].sort((a, b) => a.year - b.year);
    });

    console.log(`✅ [태양광] ${Object.keys(data).length}개 발전소 조회 완료`);

    res.json({
      success: true,
      data: data
    });

  } catch (err) {
    console.error('❌ [태양광] 조회 오류:', err);
    res.status(500).json({
      success: false,
      message: 'DB 조회 실패',
      error: err.message
    });
  }
});

// ===== 풍력 발전소 연도별 발전량 조회 API (slide.html용) =====
app.get('/api/wind/yearly-power', async (req, res) => {
  try {
    console.log('\n🔍 [풍력] 연도별 발전량 조회 시작...');
    
    const result = await pool.query(`
      SELECT "발전구분", "일자", "발전시간", "발전량_mwh"
      FROM public."남동발전_시간대별풍력발전실적"
      ORDER BY "발전구분", "일자", "발전시간"
    `);

    const yearlyData = {};

    result.rows.forEach(row => {
      const plantName = row.발전구분;
      const date = row.일자;
      const year = date.substring(0, 4);
      const amount = Number(row.발전량_mwh);

      if (!yearlyData[plantName]) yearlyData[plantName] = {};
      if (!yearlyData[plantName][year]) yearlyData[plantName][year] = 0;

      yearlyData[plantName][year] += amount;
    });

    const data = {};
    Object.keys(yearlyData).forEach(plantName => {
      data[plantName] = [];
      Object.keys(yearlyData[plantName]).forEach(year => {
        data[plantName].push({
          year: parseInt(year),
          value: yearlyData[plantName][year]
        });
      });
      data[plantName].sort((a, b) => a.year - b.year);
    });

    console.log(`✅ [풍력] ${Object.keys(data).length}개 발전소 조회 완료`);

    res.json({
      success: true,
      data: data
    });

  } catch (err) {
    console.error('❌ [풍력] 조회 오류:', err);
    res.status(500).json({
      success: false,
      message: 'DB 조회 실패',
      error: err.message
    });
  }
});
app.get('/api/thermal/daily-power', async (req, res) => {
  try {
    console.log('\n🔍 [화력] 일별 발전량 조회 시작...');
    
    const result = await pool.query(`
      SELECT "호기", "일자", "발전시간", "발전량_mwh"
      FROM public."남동발전_분당화력_시간대별발전실적"
      ORDER BY "호기", "일자", "발전시간"
    `);

    console.log(`📊 [화력] 조회된 원본 데이터: ${result.rows.length}행`);

    if (result.rows.length === 0) {
      return res.json({
        success: false,
        message: '화력 발전소 데이터가 없습니다',
        data: {}
      });
    }

    const dailyData = {};

    result.rows.forEach(row => {
      const unit = row.호기;
      const date = row.일자; // 형식: YYYYMMDD
      const amount = Number(row.발전량_mwh) || 0;

      if (!date) return;

      if (!dailyData[unit]) {
        dailyData[unit] = {};
      }
      if (!dailyData[unit][date]) {
        dailyData[unit][date] = 0;
      }

      dailyData[unit][date] += amount;
    });

    // 배열 형태로 변환
    const data = {};
    Object.keys(dailyData).forEach(unit => {
      data[unit] = [];
      Object.keys(dailyData[unit]).forEach(date => {
        data[unit].push({
          date: date,
          value: Math.round(dailyData[unit][date] * 100) / 100
        });
      });
      // 날짜순 정렬
      data[unit].sort((a, b) => a.date.localeCompare(b.date));
    });

    console.log(`✅ [화력] 일별 데이터 조회 완료: ${Object.keys(data).length}개 호기`);

    res.json({
      success: true,
      data: data
    });

  } catch (err) {
    console.error('❌ [화력 일별] 조회 오류:', err);
    res.status(500).json({
      success: false,
      message: 'DB 조회 실패',
      error: err.message
    });
  }
});

// ===== 태양광 발전소 일별 발전량 조회 API =====
app.get('/api/solar/daily-power', async (req, res) => {
  try {
    console.log('\n🔍 [태양광] 일별 발전량 조회 시작...');
    
    const result = await pool.query(`
      SELECT "발전구분", "일자", "발전시간", "발전량_kwh"
      FROM public."남동발전_시간대별태양광발전실적"
      ORDER BY "발전구분", "일자", "발전시간"
    `);

    console.log(`📊 [태양광] 조회된 원본 데이터: ${result.rows.length}행`);

    if (result.rows.length === 0) {
      return res.json({
        success: false,
        message: '태양광 발전소 데이터가 없습니다',
        data: {}
      });
    }

    const dailyData = {};

    result.rows.forEach(row => {
      const plantName = row.발전구분;
      const date = row.일자;
      const amount = (Number(row.발전량_kwh) || 0) / 1000; // kWh -> MWh

      if (!date || !plantName) return;

      if (!dailyData[plantName]) {
        dailyData[plantName] = {};
      }
      if (!dailyData[plantName][date]) {
        dailyData[plantName][date] = 0;
      }

      dailyData[plantName][date] += amount;
    });

    const data = {};
    Object.keys(dailyData).forEach(plantName => {
      data[plantName] = [];
      Object.keys(dailyData[plantName]).forEach(date => {
        data[plantName].push({
          date: date,
          value: Math.round(dailyData[plantName][date] * 100) / 100
        });
      });
      data[plantName].sort((a, b) => a.date.localeCompare(b.date));
    });

    console.log(`✅ [태양광] 일별 데이터 조회 완료: ${Object.keys(data).length}개 발전소`);

    res.json({
      success: true,
      data: data
    });

  } catch (err) {
    console.error('❌ [태양광 일별] 조회 오류:', err);
    res.status(500).json({
      success: false,
      message: 'DB 조회 실패',
      error: err.message
    });
  }
});

// ===== 풍력 발전소 일별 발전량 조회 API =====
app.get('/api/wind/daily-power', async (req, res) => {
  try {
    console.log('\n🔍 [풍력] 일별 발전량 조회 시작...');
    
    const result = await pool.query(`
      SELECT "발전구분", "일자", "발전시간", "발전량_mwh"
      FROM public."남동발전_시간대별풍력발전실적"
      ORDER BY "발전구분", "일자", "발전시간"
    `);

    console.log(`📊 [풍력] 조회된 원본 데이터: ${result.rows.length}행`);

    if (result.rows.length === 0) {
      return res.json({
        success: false,
        message: '풍력 발전소 데이터가 없습니다',
        data: {}
      });
    }

    const dailyData = {};

    result.rows.forEach(row => {
      const plantName = row.발전구분;
      const date = row.일자;
      const amount = Number(row.발전량_mwh) || 0;

      if (!date || !plantName) return;

      if (!dailyData[plantName]) {
        dailyData[plantName] = {};
      }
      if (!dailyData[plantName][date]) {
        dailyData[plantName][date] = 0;
      }

      dailyData[plantName][date] += amount;
    });

    const data = {};
    Object.keys(dailyData).forEach(plantName => {
      data[plantName] = [];
      Object.keys(dailyData[plantName]).forEach(date => {
        data[plantName].push({
          date: date,
          value: Math.round(dailyData[plantName][date] * 100) / 100
        });
      });
      data[plantName].sort((a, b) => a.date.localeCompare(b.date));
    });

    console.log(`✅ [풍력] 일별 데이터 조회 완료: ${Object.keys(data).length}개 발전소`);

    res.json({
      success: true,
      data: data
    });

  } catch (err) {
    console.error('❌ [풍력 일별] 조회 오류:', err);
    res.status(500).json({
      success: false,
      message: 'DB 조회 실패',
      error: err.message
    });
  }
});

// ===== 한수원 실시간 API (JSON 반환) =====
app.get('/api/khnp/realtime-json', async (req, res) => {
  const { genName } = req.query;
  
  if (!genName) {
    return res.status(400).json({ 
      success: false, 
      message: 'genName 파라미터가 필요합니다' 
    });
  }

  const API_URL = 'http://data.khnp.co.kr/environ/service/realtime/waterPwr';
  const SERVICE_KEY = '2ea671893271f4e1752c6a258014c54339c040da9783555cff1014fdf0cc1716';

  try {
    const response = await axios.get(API_URL, {
      params: {
        serviceKey: SERVICE_KEY,
        genName: genName
      },
      timeout: 10000
    });

    // XML을 JSON으로 파싱
    const parser = new xml2js.Parser({ explicitArray: false });
    const result = await parser.parseStringPromise(response.data);
    
    // ✅ 수정: 'genOutput' 대신 'power' 필드 사용
    const item = result?.response?.body?.item;
    
    if (item && item.power) {
      res.json({
        success: true,
        genName: genName,
        genOutput: parseFloat(item.power),  // ✅ power 필드를 genOutput으로 반환
        unit: 'MW',
        timestamp: item.time || new Date().toISOString()
      });
    } else {
      res.status(404).json({
        success: false,
        message: '발전량 데이터를 찾을 수 없습니다'
      });
    }

  } catch (error) {
    console.error('❌ [한수원 API JSON] 오류:', error.message);
    res.status(500).json({
      success: false,
      message: 'API 호출 실패',
      error: error.message
    });
  }
});

// ===== 절전 챌린지 데이터 조회 =====
app.get('/api/challenge/:userId', async (req, res) => {
  const { userId } = req.params;
  if (!userId) return res.status(400).json({ success: false, message: 'user_id 누락' });

  try {
    const result = await pool.query(
      `SELECT user_id, challenge_date, stamp_air, stamp_off, stamp_power, stamp_efficiency, stamp_etc, save_kwh, update_at
       FROM public.member_challenge
       WHERE user_id = $1
       ORDER BY challenge_date DESC`,
      [userId]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('❌ 절전 챌린지 조회 오류:', err);
    res.status(500).json({ success: false, message: 'DB 조회 실패', error: err.message });
  }
});

// ===== 절전 챌린지 데이터 저장 (업서트) =====
app.post('/api/challenge', async (req, res) => {
  const { user_id, challenge_date, stamp_air, stamp_off, stamp_power, stamp_efficiency, stamp_etc, save_kwh } = req.body;

  if (!user_id || !challenge_date) {
    return res.status(400).json({ success: false, message: 'user_id와 challenge_date는 필수입니다' });
  }

  try {
    console.log('📥 절전 챌린지 저장 요청:', { user_id, challenge_date, stamp_air, stamp_off, stamp_power, stamp_efficiency, stamp_etc, save_kwh });
    
    const result = await pool.query(
      `INSERT INTO public.member_challenge 
        (user_id, challenge_date, stamp_air, stamp_off, stamp_power, stamp_efficiency, stamp_etc, save_kwh, update_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, challenge_date)
       DO UPDATE SET
         stamp_air = $3,
         stamp_off = $4,
         stamp_power = $5,
         stamp_efficiency = $6,
         stamp_etc = $7,
         save_kwh = $8,
         update_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [user_id, challenge_date, stamp_air || 'X', stamp_off || 'X', stamp_power || 'X', stamp_efficiency || 'X', stamp_etc || '', save_kwh || 0]
    );
    console.log('✅ 절전 챌린지 저장 성공:', result.rows[0]);
    res.json({ success: true, message: '절전 챌린지 데이터 저장 완료', data: result.rows[0] });
  } catch (err) {
    console.error('❌ 절전 챌린지 저장 DB 오류:', err);
    console.error('   - 오류 코드:', err.code);
    console.error('   - 오류 메시지:', err.message);
    console.error('   - 상세 정보:', err.detail);
    res.status(500).json({ success: false, message: 'DB 저장 실패', error: err.message, detail: err.detail });
  }
});

// ===== 절전 챌린지 데이터 삭제 =====
app.delete('/api/challenge/:userId/:date', async (req, res) => {
  const { userId, date } = req.params;
  if (!userId || !date) return res.status(400).json({ success: false, message: 'user_id와 date는 필수입니다' });

  try {
    const result = await pool.query(
      `DELETE FROM public.member_challenge
       WHERE user_id = $1 AND challenge_date = $2
       RETURNING *`,
      [userId, date]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '해당 데이터를 찾을 수 없습니다' });
    }
    res.json({ success: true, message: '절전 챌린지 데이터 삭제 완료', data: result.rows[0] });
  } catch (err) {
    console.error('❌ 절전 챌린지 삭제 오류:', err);
    res.status(500).json({ success: false, message: 'DB 삭제 실패', error: err.message });
  }
});

// ===== 절전 챌린지 통계 조회 =====
app.get('/api/challenge-stats/:userId', async (req, res) => {
  const { userId } = req.params;
  if (!userId) return res.status(400).json({ success: false, message: 'user_id 누락' });

  try {
    const result = await pool.query(
      `SELECT 
        COUNT(*) as total_days,
        SUM(CASE WHEN stamp_air = 'O' THEN 1 ELSE 0 END) as air_count,
        SUM(CASE WHEN stamp_off = 'O' THEN 1 ELSE 0 END) as off_count,
        SUM(CASE WHEN stamp_power = 'O' THEN 1 ELSE 0 END) as power_count,
        SUM(CASE WHEN stamp_efficiency = 'O' THEN 1 ELSE 0 END) as efficiency_count,
        ROUND(CAST(SUM(save_kwh) AS numeric),2) as total_kwh
       FROM public.member_challenge
       WHERE user_id = $1`,
      [userId]
    );
    const stats = result.rows[0];
    res.json({
      success: true,
      data: {
        totalKwh: parseFloat(stats.total_kwh) || 0
      }
    });
  } catch (err) {
    console.error('❌ 절전 챌린지 통계 조회 오류:', err);
    res.status(500).json({ success: false, message: 'DB 조회 실패', error: err.message });
  }
});
