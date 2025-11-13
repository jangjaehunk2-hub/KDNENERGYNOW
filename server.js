const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(bodyParser.json());
app.use(cors());
app.use(express.static('.')); // 현재 폴더의 HTML 제공

// PostgreSQL 연결
const pool = new Pool({
  user: 'postgres',           // DB 유저
  host: "116.122.157.223",          // DB 호스트
  database: 'postgres',  // DB 이름
  password: '1',  // DB 비밀번호
  port: 5432
});

// ===== 회원가입 API =====
app.post('/signup', async (req, res) => {
  const { user_id, nick_name, email, password } = req.body;
  const score = 0;
  const admin_flag = false;

  try {
    const query = `
      INSERT INTO member (user_id, nick_name, pass, email, score, admin_flag)
      VALUES ($1, $2, $3, $4, 0, false)
      RETURNING user_id
    `;
    const values = [user_id, nick_name, password, email];

    const result = await pool.query(query, values);
    res.json({ success: true, message: '회원가입 완료!', user: result.rows[0]});
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '회원가입 실패: 중복 아이디 또는 서버 오류' });
  }
});

// ===== 로그인 API =====
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const query = `
      SELECT user_id, nick_name, email, score, admin_flag
      FROM member
      WHERE email=$1 AND pass=$2
    `;
    const values = [email, password];
    const result = await pool.query(query, values);

    if(result.rows.length > 0){
      res.json({ success: true, message: '로그인 성공!', user: result.rows[0] });
    } else {
      res.status(401).json({ success: false, message: '이메일 또는 비밀번호가 틀렸습니다.' });
    }
  } catch(err) {
    console.error(err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ===== 로그인 요청 처리 =====
app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});

// ===== 점수 업데이트 API =====
app.post('/update-score', async (req, res) => {
  const { user_id, score } = req.body;  // 클라이언트에서 user_id와 이번 게임 점수 전달

  if (!user_id || score === undefined) {
    return res.status(400).json({ success: false, message: 'user_id 또는 score 누락' });
  }

  try {
    const query = `
      UPDATE member
      SET score = COALESCE(score, 0) + $1
      WHERE user_id = $2
      SELECT score FROM member WHERE user_id = $2
    `;
    const values = [score, user_id];
    const result = await pool.query(query, values);

    if (result.rows.length > 0) {
      res.json({ success: true, newScore: result.rows[0].score });
    } else {
      res.status(404).json({ success: false, message: '해당 유저를 찾을 수 없습니다.' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// ===== 점수 조회 API =====
app.get('/get-score', async (req, res) => {
  const user_id = req.query.user_id;
  if(!user_id) return res.status(400).json({ success: false, message: 'user_id 누락' });

  try {
    const result = await pool.query('SELECT score FROM member WHERE user_id=$1', [user_id]);
    if(result.rows.length > 0){
      res.json({ success:true, score: result.rows[0].score });
    } else {
      res.status(404).json({ success:false, message:'해당 유저 없음' });
    }
  } catch(err){
    console.error(err);
    res.status(500).json({ success:false, message:'서버 오류' });
  }
});
