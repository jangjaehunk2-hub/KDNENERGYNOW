# PostgreSQL 데이터베이스 연결을 위한 라이브러리
import psycopg2
# GUI 구현을 위한 tkinter 라이브러리
import tkinter as tk
# 메시지 박스 표시를 위한 messagebox 모듈
from tkinter import messagebox

# PostgreSQL 데이터베이스 접속 설정
# 실제 운영 환경에서는 이 정보를 별도의 설정 파일로 분리하는 것이 좋습니다.
DB_CONFIG = {
    "host": "116.122.157.223",      # 데이터베이스 서버 주소
    "port": 5432,                   # PostgreSQL 기본 포트
    "dbname": "postgres",           # 데이터베이스 이름
    "user": "postgres",             # 데이터베이스 사용자
    "password": "1"                 # 데이터베이스 비밀번호
}


# 로그인 화면을 구현하는 클래스
class LoginApp:
    def __init__(self, master):
        # 메인 창 설정
        self.master = master
        master.title("PostgreSQL 로그인")
        master.geometry("320x160")  # 창 크기 설정
        master.resizable(False, False)  # 창 크기 조절 비활성화

        # 메인 프레임 생성 및 설정
        frame = tk.Frame(master, padx=10, pady=10)  # 여백 설정
        frame.pack(expand=True, fill="both")  # 프레임을 창에 맞게 확장

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
        # 입력된 아이디와 비밀번호를 가져와서 공백 제거
        user_id = self.entry_id.get().strip()
        password = self.entry_pw.get().strip()

        # 아이디나 비밀번호가 비어있는지 확인
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
                WHERE admin_flag=TRUE AND user_id = %s AND pass = %s;
            """
            cur.execute(query, (user_id, password))
            result = cur.fetchone()

            if result:
                nick_name, admin_flag = result
                if admin_flag:
                    messagebox.showinfo("환영", f"어서오십시오 관리자님 ({nick_name})")
                    self.master.destroy()
                    open_admin_menu(nick_name)
                else:
                    messagebox.showwarning("접근 제한", "관리자 계정이 아닙니다.")
            else:
                messagebox.showwarning("로그인 실패", "아이디 또는 비밀번호가 일치하지 않습니다.")

            cur.close()
            conn.close()

        except psycopg2.OperationalError as e:
            messagebox.showerror("데이터베이스 오류", f"서버에 연결할 수 없습니다.\n{e}")
        except Exception as e:
            messagebox.showerror("오류", f"문제가 발생했습니다.\n{e}")


# --- 관리자 메뉴 창 ---
# --- 관리자 메뉴 창 생성 함수 ---
def open_admin_menu(nick_name):
    # 새 창 생성 및 기본 설정
    menu = tk.Tk()
    menu.title("관리자 메뉴")
    menu.geometry("1024x768")  # 창 크기 설정
    menu.resizable(False, False)  # 창 크기 조절 비활성화

    # 메인 프레임 생성
    frame = tk.Frame(menu)
    frame.pack(pady=30)  # 상단 여백 설정

    tk.Label(frame, text=f"{nick_name} 관리자님 환영합니다!", font=("맑은 고딕", 14, "bold")).grid(row=0, column=0, columnspan=3, pady=20)

    btn1 = tk.Button(frame, text="위도 경도 수정", width=15, height=2)
    btn1.grid(row=1, column=0, padx=10, pady=10)

    btn2 = tk.Button(frame, text="데이터 조회", width=15, height=2)
    btn2.grid(row=1, column=1, padx=10, pady=10)

    btn3 = tk.Button(frame, text="시스템 설정", width=15, height=2)
    btn3.grid(row=1, column=2, padx=10, pady=10)

    menu.mainloop()


if __name__ == "__main__":
    root = tk.Tk()
    app = LoginApp(root)
    root.mainloop()
