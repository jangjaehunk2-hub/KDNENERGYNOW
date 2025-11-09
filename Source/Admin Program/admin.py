# -*- coding: utf-8 -*-
# PostgreSQL 데이터베이스 연결을 위한 라이브러리
import psycopg2
# GUI 구현을 위한 tkinter 라이브러리
import tkinter as tk
from tkinter import ttk
# 메시지 박스 표시를 위한 messagebox 모듈
from tkinter import messagebox

# PostgreSQL 데이터베이스 접속 설정
DB_CONFIG = {
    "host": "116.122.157.223",
    "port": 5432,
    "dbname": "postgres",
    "user": "postgres",
    "password": "1"
}


# 로그인 화면을 구현하는 클래스
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
            conn = psycopg2.connect(**DB_CONFIG)
            cur = conn.cursor()

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
                    messagebox.showinfo("환영", "어서오십시오 관리자님 ({})".format(nick_name))
                    self.master.destroy()
                    open_admin_menu(nick_name)
                else:
                    messagebox.showwarning("접근 제한", "관리자 계정이 아닙니다.")
            else:
                messagebox.showwarning("로그인 실패", "아이디 또는 비밀번호가 일치하지 않습니다.")

            cur.close()
            conn.close()

        except psycopg2.OperationalError as e:
            messagebox.showerror("데이터베이스 오류", "서버에 연결할 수 없습니다.\n{}".format(e))
        except Exception as e:
            messagebox.showerror("오류", "문제가 발생했습니다.\n{}".format(e))


# 위도 경도 수정 창
def open_coordinate_editor():
    coord_window = tk.Toplevel()
    coord_window.title("위도 경도 수정")
    coord_window.geometry("900x600")
    coord_window.resizable(False, False)

    # 상단 프레임 - 검색 및 새로고침
    top_frame = tk.Frame(coord_window, padx=10, pady=10)
    top_frame.pack(fill="x")

    tk.Label(top_frame, text="검색:", font=("맑은 고딕", 10)).pack(side="left", padx=5)
    search_entry = tk.Entry(top_frame, width=30)
    search_entry.pack(side="left", padx=5)

    def search_data():
        keyword = search_entry.get().strip()
        load_data(keyword)

    tk.Button(top_frame, text="검색", command=search_data, width=8).pack(side="left", padx=5)
    tk.Button(top_frame, text="전체 보기", command=lambda: load_data(), width=10).pack(side="left", padx=5)

    # 중간 프레임 - 테이블
    table_frame = tk.Frame(coord_window, padx=10, pady=5)
    table_frame.pack(fill="both", expand=True)

    # 스크롤바
    scrollbar_y = tk.Scrollbar(table_frame, orient="vertical")
    scrollbar_x = tk.Scrollbar(table_frame, orient="horizontal")

    # Treeview (테이블)
    columns = ("ID", "이름", "위도", "경도", "설명")
    tree = ttk.Treeview(table_frame, columns=columns, show="headings", 
                        yscrollcommand=scrollbar_y.set, xscrollcommand=scrollbar_x.set)

    # 컬럼 설정
    tree.heading("ID", text="ID")
    tree.heading("이름", text="이름")
    tree.heading("위도", text="위도")
    tree.heading("경도", text="경도")
    tree.heading("설명", text="설명")

    tree.column("ID", width=80, anchor="center")
    tree.column("이름", width=150, anchor="w")
    tree.column("위도", width=120, anchor="center")
    tree.column("경도", width=120, anchor="center")
    tree.column("설명", width=300, anchor="w")

    scrollbar_y.config(command=tree.yview)
    scrollbar_x.config(command=tree.xview)

    tree.pack(side="left", fill="both", expand=True)
    scrollbar_y.pack(side="right", fill="y")
    scrollbar_x.pack(side="bottom", fill="x")

    # 하단 프레임 - 수정 입력 필드
    bottom_frame = tk.Frame(coord_window, padx=10, pady=10, relief="groove", borderwidth=2)
    bottom_frame.pack(fill="x")

    tk.Label(bottom_frame, text="선택된 항목 수정", font=("맑은 고딕", 11, "bold")).grid(row=0, column=0, columnspan=4, pady=5)

    tk.Label(bottom_frame, text="ID:").grid(row=1, column=0, sticky="e", padx=5, pady=5)
    id_entry = tk.Entry(bottom_frame, width=15, state="readonly")
    id_entry.grid(row=1, column=1, padx=5, pady=5)

    tk.Label(bottom_frame, text="이름:").grid(row=1, column=2, sticky="e", padx=5, pady=5)
    name_entry = tk.Entry(bottom_frame, width=20)
    name_entry.grid(row=1, column=3, padx=5, pady=5)

    tk.Label(bottom_frame, text="위도:").grid(row=2, column=0, sticky="e", padx=5, pady=5)
    lat_entry = tk.Entry(bottom_frame, width=15)
    lat_entry.grid(row=2, column=1, padx=5, pady=5)

    tk.Label(bottom_frame, text="경도:").grid(row=2, column=2, sticky="e", padx=5, pady=5)
    lon_entry = tk.Entry(bottom_frame, width=15)
    lon_entry.grid(row=2, column=3, padx=5, pady=5)

    tk.Label(bottom_frame, text="설명:").grid(row=3, column=0, sticky="e", padx=5, pady=5)
    desc_entry = tk.Entry(bottom_frame, width=50)
    desc_entry.grid(row=3, column=1, columnspan=3, padx=5, pady=5, sticky="we")

    # 데이터 로드 함수
    def load_data(search_keyword=""):
        try:
            conn = psycopg2.connect(**DB_CONFIG)
            cur = conn.cursor()

            # 실제 테이블 이름과 컬럼명에 맞게 수정하세요!
            # 예시: locations 테이블 사용
            if search_keyword:
                query = """
                    SELECT id, 발전소명, latitude, longitude, 위치_수계
                    FROM 수력발전소
                    WHERE 발전소명 ILIKE %s OR 위치_수계 ILIKE %s
                    ORDER BY id;
                """
                cur.execute(query, ('%{}%'.format(search_keyword), '%{}%'.format(search_keyword)))
            else:
                query = """
                    SELECT id, 발전소명, latitude, longitude, 위치_수계 
                    FROM 수력발전소 
                    ORDER BY id;
                """
                cur.execute(query)

            # 기존 데이터 삭제
            for item in tree.get_children():
                tree.delete(item)

            # 새 데이터 삽입
            rows = cur.fetchall()
            for row in rows:
                tree.insert("", "end", values=row)

            cur.close()
            conn.close()

        except psycopg2.Error as e:
            messagebox.showerror("오류", "데이터를 불러올 수 없습니다.\n{}".format(e))

    # 항목 선택 시 입력 필드에 표시
    def on_item_select(event):
        selected = tree.selection()
        if selected:
            item = tree.item(selected[0])
            values = item['values']
            
            id_entry.config(state="normal")
            id_entry.delete(0, tk.END)
            id_entry.insert(0, values[0])
            id_entry.config(state="readonly")
            
            name_entry.delete(0, tk.END)
            name_entry.insert(0, values[1])
            
            lat_entry.delete(0, tk.END)
            lat_entry.insert(0, values[2])
            
            lon_entry.delete(0, tk.END)
            lon_entry.insert(0, values[3])
            
            desc_entry.delete(0, tk.END)
            desc_entry.insert(0, values[4] if values[4] else "")

    tree.bind("<<TreeviewSelect>>", on_item_select)

    # 수정 저장 함수
    def save_changes():
        selected = tree.selection()
        if not selected:
            messagebox.showwarning("경고", "수정할 항목을 선택하세요.")
            return

        record_id = id_entry.get()
        name = name_entry.get().strip()
        latitude = lat_entry.get().strip()
        longitude = lon_entry.get().strip()
        description = desc_entry.get().strip()

        if not name or not latitude or not longitude:
            messagebox.showwarning("경고", "이름, 위도, 경도는 필수 입력 항목입니다.")
            return

        try:
            # 위도/경도 형식 검증
            float(latitude)
            float(longitude)
        except ValueError:
            messagebox.showerror("오류", "위도와 경도는 숫자여야 합니다.")
            return

        try:
            conn = psycopg2.connect(**DB_CONFIG)
            cur = conn.cursor()

            # 실제 테이블 이름에 맞게 수정하세요!
            query = """
                UPDATE 수력발전소 
                SET 발전소명 = %s, latitude = %s, longitude = %s, 위치_수계 = %s
                WHERE id = %s;
            """
            cur.execute(query, (name, latitude, longitude, description, record_id))
            conn.commit()

            messagebox.showinfo("성공", "수정이 완료되었습니다.")
            load_data()  # 데이터 새로고침

            cur.close()
            conn.close()

        except psycopg2.Error as e:
            messagebox.showerror("오류", "수정에 실패했습니다.\n{}".format(e))

    # 버튼 프레임
    button_frame = tk.Frame(coord_window, padx=10, pady=10)
    button_frame.pack()

    tk.Button(button_frame, text="수정 저장", command=save_changes, width=12, height=2, 
              bg="#4CAF50", fg="white", font=("맑은 고딕", 10, "bold")).pack(side="left", padx=5)
    tk.Button(button_frame, text="닫기", command=coord_window.destroy, width=12, height=2,
              font=("맑은 고딕", 10)).pack(side="left", padx=5)

    # 초기 데이터 로드
    load_data()


# 관리자 메뉴 창 생성 함수
def open_admin_menu(nick_name):
    menu = tk.Tk()
    menu.title("관리자 메뉴")
    menu.geometry("500x300")
    menu.resizable(False, False)

    frame = tk.Frame(menu)
    frame.pack(pady=30)

    tk.Label(frame, text="{} 관리자님 환영합니다!".format(nick_name), 
             font=("맑은 고딕", 14, "bold")).grid(row=0, column=0, columnspan=3, pady=20)

    btn1 = tk.Button(frame, text="위도 경도 수정", width=15, height=2, 
                     command=open_coordinate_editor, bg="#2196F3", fg="white",
                     font=("맑은 고딕", 10, "bold"))
    btn1.grid(row=1, column=0, padx=10, pady=10)

    btn2 = tk.Button(frame, text="데이터 조회", width=15, height=2,
                     font=("맑은 고딕", 10))
    btn2.grid(row=1, column=1, padx=10, pady=10)

    btn3 = tk.Button(frame, text="시스템 설정", width=15, height=2,
                     font=("맑은 고딕", 10))
    btn3.grid(row=1, column=2, padx=10, pady=10)

    tk.Button(frame, text="종료", command=menu.destroy, width=10, height=1,
              font=("맑은 고딕", 9)).grid(row=2, column=0, columnspan=3, pady=10)

    menu.mainloop()


if __name__ == "__main__":
    root = tk.Tk()
    app = LoginApp(root)
    root.mainloop()