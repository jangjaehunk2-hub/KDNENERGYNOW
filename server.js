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
    res.json({ success: true, message: '회원가입 완료!', user: result.rows[0].user_id });
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

// ===== 로그인 요청 처리 =====
app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
