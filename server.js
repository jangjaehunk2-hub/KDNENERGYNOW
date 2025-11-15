const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');

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

<<<<<<< Updated upstream
<<<<<<< Updated upstream
<<<<<<< Updated upstream
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
=======
// ===== 원자력 발전소 호기별 발전량 통합 조회 =====
app.get('/api/nuclear/full', async (req, res) => {
  try {
    // 1️⃣ 발전소 위치 정보 가져오기
    const plantsResult = await pool.query(`
      SELECT * 
      FROM public."power_plant"
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
    const plantUnits = {};

=======
// ===== 원자력 발전소 호기별 발전량 통합 조회 =====
app.get('/api/nuclear/full', async (req, res) => {
  try {
    // 1️⃣ 발전소 위치 정보 가져오기
    const plantsResult = await pool.query(`
      SELECT * 
      FROM public."power_plant"
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
    const plantUnits = {};

>>>>>>> Stashed changes
    powerResult.rows.forEach(row => {
      const key = row.발전소명; // 발전소명 기준

      if (!groupedPower[key]) groupedPower[key] = [];
      groupedPower[key].push({
        year: row.년도,
        unit: row.호기명,
        value: row.발전량mwh
>>>>>>> Stashed changes
      });
    }

<<<<<<< Updated upstream
<<<<<<< Updated upstream
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
=======
      if (!plantUnits[key]) plantUnits[key] = [];
      if (!plantUnits[key].includes(row.호기명)) plantUnits[key].push(row.호기명);
    });

    // 4️⃣ 발전소 위치 + 호기정보 합치기
    const result = plantsResult.rows.map(plant => {
      const key = plant.plant_name;

      // 호기별 발전량 객체로 변환
      const powerByUnit = {};
      (groupedPower[key] || []).forEach(item => {
        if (!powerByUnit[item.unit]) powerByUnit[item.unit] = [];
        powerByUnit[item.unit].push({ year: item.year, value: item.value });
      });

      return {
        ...plant,
        units: plantUnits[key] || [],
        powerData: powerByUnit
      };
    });

    res.json(result);

  } catch (err) {
    console.error('❌ 발전소/호기 통합 조회 오류:', err);
    res.status(500).json({ success: false, message: 'DB 조회 실패', error: err.message });
>>>>>>> Stashed changes
  }
});

// ===== 원자력발전소 발전량 조회 API =====
app.get('/api/nuclear/power', async (req, res) => {
=======
// ===== 원자력 발전소 호기별 발전량 통합 조회 =====
app.get('/api/nuclear/full', async (req, res) => {
>>>>>>> Stashed changes
  try {
    // 1️⃣ 발전소 위치 정보 가져오기
    const plantsResult = await pool.query(`
      SELECT * 
      FROM public."power_plant"
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
    const plantUnits = {};

    powerResult.rows.forEach(row => {
      const key = row.발전소명; // 발전소명 기준

      if (!groupedPower[key]) groupedPower[key] = [];
      groupedPower[key].push({
        year: row.년도,
        unit: row.호기명,
        value: row.발전량mwh
      });

      if (!plantUnits[key]) plantUnits[key] = [];
      if (!plantUnits[key].includes(row.호기명)) plantUnits[key].push(row.호기명);
    });

    // 4️⃣ 발전소 위치 + 호기정보 합치기
    const result = plantsResult.rows.map(plant => {
      const key = plant.plant_name;

      // 호기별 발전량 객체로 변환
      const powerByUnit = {};
      (groupedPower[key] || []).forEach(item => {
        if (!powerByUnit[item.unit]) powerByUnit[item.unit] = [];
        powerByUnit[item.unit].push({ year: item.year, value: item.value });
      });

      return {
        ...plant,
        units: plantUnits[key] || [],
        powerData: powerByUnit
      };
    });

    res.json(result);

  } catch (err) {
=======
      if (!plantUnits[key]) plantUnits[key] = [];
      if (!plantUnits[key].includes(row.호기명)) plantUnits[key].push(row.호기명);
    });

    // 4️⃣ 발전소 위치 + 호기정보 합치기
    const result = plantsResult.rows.map(plant => {
      const key = plant.plant_name;

      // 호기별 발전량 객체로 변환
      const powerByUnit = {};
      (groupedPower[key] || []).forEach(item => {
        if (!powerByUnit[item.unit]) powerByUnit[item.unit] = [];
        powerByUnit[item.unit].push({ year: item.year, value: item.value });
      });

      return {
        ...plant,
        units: plantUnits[key] || [],
        powerData: powerByUnit
      };
    });

    res.json(result);

  } catch (err) {
>>>>>>> Stashed changes
    console.error('❌ 발전소/호기 통합 조회 오류:', err);
    res.status(500).json({ success: false, message: 'DB 조회 실패', error: err.message });
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