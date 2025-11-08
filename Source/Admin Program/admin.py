import psycopg2
import tkinter as tk
from tkinter import messagebox

# PostgreSQL 접속 정보 (본인 서버에 맞게 수정)
DB_CONFIG = {
    "host": "116.122.157.223",   # 예: "192.168.0.100" 또는 "db.example.com"
    "port": 5432,
    "dbname": "postgres",
    "user": "postgres",
    "password": "1"
}

class LoginApp:
    def __init__(self, master):
        self.master = master
        master.title("PostgreSQL 로그인")
        master.geometry("320x160")
        master.resizable(False, False)

        frame = tk.Frame(master, padx=10, pady=10)
        frame.pack(expand=True, fill="both")

        # 아이디 입력
        tk.Label(frame, text="아이디:").grid(row=0, column=0, sticky="e", pady=(5, 5))
        self.entry_id = tk.Entry(frame)
        self.entry_id.grid(row=0, column=1, padx=(5, 0))

        # 비밀번호 입력
        tk.Label(frame, text="비밀번호:").grid(row=1, column=0, sticky="e", pady=(5, 5))
        self.entry_pw = tk.Entry(frame, show="*")
        self.entry_pw.grid(row=1, column=1, padx=(5, 0))

        # 로그인 버튼
        login_btn = tk.Button(frame, text="로그인", command=self.try_login, width=12)
        login_btn.grid(row=2, column=0, columnspan=2, pady=(10, 0))

        master.bind("<Return>", lambda e: self.try_login())

    def try_login(self):
        user_id = self.entry_id.get().strip()
        password = self.entry_pw.get().strip()

        if not user_id or not password:
            messagebox.showwarning("경고", "아이디와 비밀번호를 모두 입력하세요.")
            return

        try:
            # PostgreSQL 연결
            conn = psycopg2.connect(**DB_CONFIG)
            cur = conn.cursor()

            # 로그인 확인 쿼리
            query = """
                SELECT nick_name, admin_flag 
                FROM member 
                WHERE admin_flag = TRUE AND user_id = %s AND pass = %s;
            """
            cur.execute(query, (user_id, password))
            result = cur.fetchone()

            if result:
                nick_name, admin_flag = result
                if admin_flag:
                    messagebox.showinfo("환영", f"어서오십시오 관리자님 ({nick_name})")
                else:
                    messagebox.showinfo("환영", f"{nick_name}님, 로그인 성공하셨습니다.")
            else:
                messagebox.showwarning("오류", "아이디 또는 비밀번호가 일치하지 않습니다.")

            cur.close()
            conn.close()

        except psycopg2.OperationalError as e:
            messagebox.showerror("데이터베이스 오류", f"서버에 연결할 수 없습니다.\n{e}")
        except Exception as e:
            messagebox.showerror("오류", f"문제가 발생했습니다.\n{e}")

if __name__ == "__main__":
    root = tk.Tk()
    app = LoginApp(root)
    root.mainloop()
