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

// ===== 발전소 데이터 조회 API =====

// 수력발전소
app.get('/api/hydro', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT "발전소명", "운영기관", "위치_수계", latitude, longitude
       FROM public."수력발전소"
       WHERE latitude IS NOT NULL AND longitude IS NOT NULL`
    );
    console.log(`✅ [수력] 총 ${result.rows.length}개 조회됨`);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ [수력] 데이터 조회 오류:', err);
    res.status(500).json({ success: false, message: 'DB 조회 실패', error: err.message });
  }
});

// 원자력발전소 - 완전 디버깅 버전
app.get('/api/nuclear', async (req, res) => {
  try {
    console.log('\n🔍 ===== 원자력발전소 API 호출 =====');
    
    // 1단계: 테이블 존재 확인
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = '원자력발전소현황'
      );
    `);
    console.log('1️⃣ 테이블 존재 여부:', tableExists.rows[0].exists);
    
    if (!tableExists.rows[0].exists) {
      return res.status(404).json({ 
        success: false, 
        message: '원자력발전소현황 테이블이 존재하지 않습니다.' 
      });
    }

    // 2단계: 컬럼 목록 확인
    const columns = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = '원자력발전소현황'
      ORDER BY ordinal_position
    `);
    console.log('2️⃣ 테이블 컬럼 목록:');
    columns.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });

    // 3단계: 전체 데이터 개수 확인
    const totalCount = await pool.query(`
      SELECT COUNT(*) as total FROM public."원자력발전소현황"
    `);
    console.log('3️⃣ 전체 데이터 개수:', totalCount.rows[0].total);

    // 4단계: 좌표 데이터 확인
    const coordCheck = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(latitude) as lat_count,
        COUNT(longitude) as lon_count,
        COUNT(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 END) as both_count
      FROM public."원자력발전소현황"
    `);
    console.log('4️⃣ 좌표 데이터 상태:');
    console.log('   - latitude 있음:', coordCheck.rows[0].lat_count);
    console.log('   - longitude 있음:', coordCheck.rows[0].lon_count);
    console.log('   - 둘 다 있음:', coordCheck.rows[0].both_count);

    // 5단계: 샘플 데이터 조회
    const sample = await pool.query(`
      SELECT "발전소명", latitude, longitude
      FROM public."원자력발전소현황"
      LIMIT 3
    `);
    console.log('5️⃣ 샘플 데이터:');
    sample.rows.forEach(row => {
      console.log(`   - ${row.발전소명}: lat=${row.latitude}, lon=${row.longitude}`);
    });

    // 6단계: 실제 데이터 조회 (모든 컬럼)
    const result = await pool.query(`
      SELECT * FROM public."원자력발전소현황"
    `);
    
    console.log('6️⃣ 조회된 전체 레코드:', result.rows.length);

    // 7단계: 유효한 좌표만 필터링
    const validRows = result.rows.filter(row => {
      const lat = parseFloat(row.latitude);
      const lon = parseFloat(row.longitude);
      const isValid = !isNaN(lat) && !isNaN(lon) && lat !== 0 && lon !== 0;
      
      if (!isValid && row.발전소명) {
        console.log(`   ⚠️ 좌표 없음: ${row.발전소명} (lat: ${row.latitude}, lon: ${row.longitude})`);
      }
      
      return isValid;
    });

    console.log('7️⃣ 유효한 좌표를 가진 발전소:', validRows.length + '개');
    
    if (validRows.length > 0) {
      console.log('8️⃣ 유효한 데이터 샘플:');
      validRows.slice(0, 2).forEach(row => {
        console.log(`   ✅ ${row.발전소명}: (${row.latitude}, ${row.longitude})`);
      });
    }

    console.log('🔍 ===== API 응답 준비 완료 =====\n');

    // 클라이언트에 응답
    res.json(validRows);

  } catch (err) {
    console.error('❌ [원자력] 데이터 조회 오류:', err);
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

// ===== 서버 실행 =====
const serverPort = 3000;
app.listen(serverPort, () => {
  console.log(`\n✅ ========================================`);
  console.log(`✅ Server running on http://localhost:${serverPort}`);
  console.log(`✅ ========================================\n`);
  console.log(`📍 API 엔드포인트:`);
  console.log(`   - GET  /api/hydro         (수력발전소)`);
  console.log(`   - GET  /api/nuclear       (원자력발전소)`);
  console.log(`   - GET  /api/debug/all-plants (디버깅용)`);
  console.log(`\n`);
});