// server.js
import express from 'express';
import pg from 'pg';

const app = express();
const port = 3000;

// JSON 요청 처리
app.use(express.json());

// PostgreSQL 연결
const pool = new pg.Pool({
  user: 'postgres',           // DB 계정
  host: '116.122.157.223',           // DB 서버 주소
  database: 'postgres',// DB 이름
  password: '1',        // 여기에 PostgreSQL 비밀번호 입력
  port: 5432,
});

// ===== DB 연결 테스트 =====
app.get('/api/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as now');
    res.json({ success: true, message: 'DB 연결 성공', time: result.rows[0].now });
  } catch (err) {
    console.error('❌ DB 연결 실패:', err);
    res.status(500).json({ success: false, message: 'DB 연결 실패', error: err.message });
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
    res.json({ success: true, message: '절전 챌린지 데이터 저장 완료', data: result.rows[0] });
  } catch (err) {
    console.error('❌ 절전 챌린지 저장 오류:', err);
    res.status(500).json({ success: false, message: 'DB 저장 실패', error: err.message });
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
        totalDays: parseInt(stats.total_days) || 0,
        airCount: parseInt(stats.air_count) || 0,
        offCount: parseInt(stats.off_count) || 0,
        powerCount: parseInt(stats.power_count) || 0,
        efficiencyCount: parseInt(stats.efficiency_count) || 0,
        totalKwh: parseFloat(stats.total_kwh) || 0
      }
    });
  } catch (err) {
    console.error('❌ 절전 챌린지 통계 조회 오류:', err);
    res.status(500).json({ success: false, message: 'DB 조회 실패', error: err.message });
  }
});

// 서버 시작
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
