const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');

const app = express();
// Middleware 설정
app.use(bodyParser.json());
app.use(cors());

// 정적 파일 제공 설정: 현재 폴더의 파일들을 클라이언트에 제공합니다.
app.use(express.static('.')); 

// PostgreSQL 연결 설정 (사용자 정보 유지)
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
    // 중복 키 위반 (user_id 또는 email이 UNIQUE 제약 조건이 있을 경우) 처리
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
<<<<<<< HEAD
    const result = await pool.query(
      `UPDATE member
       SET score = COALESCE(score, 0) + $1
       WHERE user_id = $2
       RETURNING score`,
      [score, user_id]
    );
=======
    const query = `
      UPDATE member
      SET score = COALESCE(score, 0) + $1
      WHERE user_id = $2
      SELECT score FROM member WHERE user_id = $2
    `;
    const values = [score, user_id];
    const result = await pool.query(query, values);
>>>>>>> 6967566a1901abf77a07886f9b2de53c053989f7

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

// ===== 발전소 데이터 조회 API (하나로 정리됨) =====
app.get('/api/hydro', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT "발전소명", "운영기관", "위치_수계", latitude, longitude
       FROM public."수력발전소"`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('수력발전소 데이터 조회 오류:', err);
    res.status(500).json({ success: false, message: 'DB 조회 실패' });
  }
});

// ===== 서버 실행 =====
const serverPort = 3000;
app.listen(serverPort, () => {
  console.log(`✅ Server running on http://localhost:${serverPort}`);
});