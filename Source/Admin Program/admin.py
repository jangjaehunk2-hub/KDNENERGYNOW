# -*- coding: utf-8 -*-
# PostgreSQL 데이터베이스 연결을 위한 라이브러리
import psycopg2
# GUI 구현을 위한 tkinter 라이브러리
import tkinter as tk
from tkinter import ttk
# 메시지 박스 표시를 위한 messagebox 모듈
from tkinter import messagebox
# API 호출을 위한 라이브러리
import requests
import xml.etree.ElementTree as ET
from datetime import datetime
from urllib.parse import quote, unquote

# PostgreSQL 데이터베이스 접속 설정
DB_CONFIG = {
    "host": "116.122.157.223",
    "port": 5432,
    "dbname": "postgres",
    "user": "postgres",
    "password": "1"
}

# API 설정
API_ENDPOINT = 'http://data.khnp.co.kr/environ/service/realtime/waterPwr'
# 인코딩된 키와 디코딩된 키 모두 준비
SERVICE_KEY_ENCODED = '2ea671893271f4e1752c6a258014c54339c040da9783555cff1014fdf0cc1716'
SERVICE_KEY = SERVICE_KEY_ENCODED  # 기본값


# 로그인 화면을 구현하는 클래스
class LoginApp:
    def __init__(self, master):
        self.master = master
        master.title("에너지나우 로그인")
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


# 실시간 데이터 조회 창
def open_data_viewer():
    viewer_window = tk.Toplevel()
    viewer_window.title("실시간 발전 데이터 조회")
    viewer_window.geometry("900x600")
    viewer_window.resizable(False, False)

    # 상단 프레임 - 정보 및 새로고침
    top_frame = tk.Frame(viewer_window, padx=10, pady=10)
    top_frame.pack(fill="x")

    tk.Label(top_frame, text="수력발전소 실시간 발전 현황", 
             font=("맑은 고딕", 12, "bold")).pack(side="left", padx=5)

    # 새로고침 버튼
    def refresh_data():
        load_api_data()

    tk.Button(top_frame, text="🔄 새로고침", command=refresh_data, 
              width=12, bg="#4CAF50", fg="white",
              font=("맑은 고딕", 9, "bold")).pack(side="right", padx=5)

    # 상태 표시
    status_label = tk.Label(top_frame, text="", font=("맑은 고딕", 9), fg="blue")
    status_label.pack(side="right", padx=10)

    # 중간 프레임 - 테이블
    table_frame = tk.Frame(viewer_window, padx=10, pady=5)
    table_frame.pack(fill="both", expand=True)

    # 스크롤바
    scrollbar_y = tk.Scrollbar(table_frame, orient="vertical")
    scrollbar_x = tk.Scrollbar(table_frame, orient="horizontal")

    # Treeview (테이블)
    columns = ("번호", "발전소구분코드", "현재출력", "측정시간")
    tree = ttk.Treeview(table_frame, columns=columns, show="headings", 
                        yscrollcommand=scrollbar_y.set, xscrollcommand=scrollbar_x.set)

    # 컬럼 설정
    tree.heading("번호", text="번호")
    tree.heading("발전소구분코드", text="발전소 구분코드")
    tree.heading("현재출력", text="현재출력 (MW)")
    tree.heading("측정시간", text="측정시간")

    tree.column("번호", width=80, anchor="center")
    tree.column("발전소구분코드", width=200, anchor="center")
    tree.column("현재출력", width=200, anchor="center")
    tree.column("측정시간", width=300, anchor="center")

    scrollbar_y.config(command=tree.yview)
    scrollbar_x.config(command=tree.xview)

    tree.pack(side="left", fill="both", expand=True)
    scrollbar_y.pack(side="right", fill="y")
    scrollbar_x.pack(side="bottom", fill="x")

    # 하단 프레임 - 상세 정보
    bottom_frame = tk.Frame(viewer_window, padx=10, pady=10, relief="groove", borderwidth=2)
    bottom_frame.pack(fill="x")

    tk.Label(bottom_frame, text="📊 API 정보", font=("맑은 고딕", 10, "bold")).grid(row=0, column=0, columnspan=2, pady=5, sticky="w")

    info_text = tk.Text(bottom_frame, height=6, width=100, state="disabled",
                       font=("맑은 고딕", 9))
    info_text.grid(row=1, column=0, columnspan=2, padx=5, pady=5)

    def update_info(message):
        info_text.config(state="normal")
        info_text.delete(1.0, tk.END)
        info_text.insert("end", message)
        info_text.config(state="disabled")

    # API 데이터 로드 함수
    def load_api_data():
        try:
            status_label.config(text="데이터 불러오는 중...", fg="orange")
            viewer_window.update()

            # 방법 1: 키를 그대로 사용 (이미 디코딩된 키일 경우)
            print("=== 방법 1: 키 그대로 사용 ===")
            url1 = API_ENDPOINT + '?serviceKey=' + SERVICE_KEY + '&genName=HC'
            print("URL:", url1)
            
            response = requests.get(url1)
            print("응답 상태 코드:", response.status_code)
            print("응답 내용:", response.content.decode('utf-8'))
            
            root = ET.fromstring(response.content)
            result_code = root.findtext('.//resultCode', default='')
            result_msg = root.findtext('.//resultMsg', default='')
            
            # 방법 1이 실패하면 방법 2 시도 (URL 인코딩)
            if result_code != '00':
                print("\n=== 방법 2: URL 인코딩 사용 ===")
                params = {
                    'serviceKey': SERVICE_KEY,
                    'genName': 'HC'
                }
                print("Params:", params)
                
                response = requests.get(API_ENDPOINT, params=params)
                print("응답 상태 코드:", response.status_code)
                print("응답 내용:", response.content.decode('utf-8'))
                
                root = ET.fromstring(response.content)
                result_code = root.findtext('.//resultCode', default='')
                result_msg = root.findtext('.//resultMsg', default='')
            
            if response.status_code == 200:
                # XML 응답 파싱
                root = ET.fromstring(response.content)
                
                # API 가이드에 따른 구조: header와 body로 구성
                result_code = root.findtext('.//resultCode', default='')
                result_msg = root.findtext('.//resultMsg', default='')
                
                if result_code == '00':  # 정상 응답
                    # 기존 데이터 삭제
                    for item in tree.get_children():
                        tree.delete(item)
                    
                    # 데이터 항목들 추출 (API 가이드에 따라 code, power, time 사용)
                    items = root.findall('.//item')
                    
                    if items:
                        for idx, item in enumerate(items, 1):
                            code = item.findtext('code', default='-')
                            power = item.findtext('power', default='0')
                            time = item.findtext('time', default='-')
                            
                            # 테이블에 삽입
                            tree.insert("", "end", values=(idx, code, power, time))
                        
                        status_label.config(text="✓ 조회 성공 ({}건)".format(len(items)), fg="green")
                        
                        # 상세 정보 표시
                        info_msg = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                        info_msg += "✓ API 호출 성공\n"
                        info_msg += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                        info_msg += "• 조회 시간: {}\n".format(datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
                        info_msg += "• 결과 코드: {} ({})\n".format(result_code, result_msg)
                        info_msg += "• 조회 건수: {}건\n".format(len(items))
                        info_msg += "• API Endpoint: {}\n".format(API_ENDPOINT)
                        info_msg += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
                        update_info(info_msg)
                    else:
                        status_label.config(text="⚠ 데이터 없음", fg="orange")
                        update_info("조회된 데이터가 없습니다.")
                else:
                    status_label.config(text="✗ API 오류", fg="red")
                    error_msg = "API 오류 발생\n"
                    error_msg += "결과 코드: {}\n".format(result_code)
                    error_msg += "메시지: {}".format(result_msg)
                    update_info(error_msg)
                    messagebox.showerror("API 오류", "결과 코드: {}\n메시지: {}".format(result_code, result_msg))
            else:
                status_label.config(text="✗ 연결 실패", fg="red")
                messagebox.showerror("오류", "API 호출 실패\nHTTP 상태 코드: {}".format(response.status_code))
                update_info("HTTP 오류: {}".format(response.status_code))
                
        except requests.exceptions.Timeout:
            status_label.config(text="✗ 시간 초과", fg="red")
            messagebox.showerror("오류", "API 요청 시간이 초과되었습니다.")
            update_info("요청 시간 초과")
        except requests.exceptions.RequestException as e:
            status_label.config(text="✗ 네트워크 오류", fg="red")
            messagebox.showerror("오류", "네트워크 오류가 발생했습니다.\n{}".format(e))
            update_info("네트워크 오류: {}".format(e))
            print("네트워크 오류 상세:", str(e))
        except ET.ParseError as e:
            status_label.config(text="✗ 데이터 파싱 오류", fg="red")
            messagebox.showerror("오류", "XML 파싱 오류가 발생했습니다.\n{}".format(e))
            update_info("XML 파싱 오류: {}".format(e))
            print("파싱 오류 상세:", str(e))
        except Exception as e:
            status_label.config(text="✗ 오류 발생", fg="red")
            messagebox.showerror("오류", "예상치 못한 오류가 발생했습니다.\n{}".format(e))
            update_info("오류: {}".format(e))
            print("예외 발생:", str(e))

    # 버튼 프레임
    button_frame = tk.Frame(viewer_window, padx=10, pady=10)
    button_frame.pack()

    tk.Button(button_frame, text="닫기", command=viewer_window.destroy, 
              width=12, height=2, font=("맑은 고딕", 10)).pack(side="left", padx=5)

    # 초기 정보 표시
    initial_info = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
    initial_info += "수력발전소 실시간 발전 데이터 조회 시스템\n"
    initial_info += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
    initial_info += "• API: 한국수력원자력 공공데이터\n"
    initial_info += "• 대상: 수력발전소 (HC)\n"
    initial_info += "• 정보: 발전소 구분코드, 현재출력, 측정시간\n"
    initial_info += "\n'🔄 새로고침' 버튼을 눌러 최신 데이터를 조회하세요."
    update_info(initial_info)

    # 초기 데이터 로드
    load_api_data()


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

            if search_keyword:
                query = """
                    SELECT 번호, 발전소명, latitude, longitude, 원자로공급사
                    FROM 원자력발전소현황
                    WHERE 발전소명 ILIKE %s OR 원자로공급사 ILIKE %s
                    ORDER BY 번호;
                """
                cur.execute(query, ('%{}%'.format(search_keyword), '%{}%'.format(search_keyword)))
            else:
                query = """
                    SELECT 번호, 발전소명, latitude, longitude, 원자로공급사
                    FROM 원자력발전소현황
                    ORDER BY 번호;
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

            query = """
                UPDATE 원자력발전소현황
                SET 발전소명 = %s, latitude = %s, longitude = %s, 원자로공급사 = %s
                WHERE 번호 = %s;
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


# 발전량 조정 (경고단계 수정) 창
def open_power_adjustment():
    adjust_window = tk.Toplevel()
    adjust_window.title("발전량 조정 - 경고단계 수정")
    adjust_window.geometry("900x600")
    adjust_window.resizable(False, False)

    # 상단 프레임 - 검색 및 새로고침
    top_frame = tk.Frame(adjust_window, padx=10, pady=10)
    top_frame.pack(fill="x")

    tk.Label(top_frame, text="검색:", font=("맑은 고딕", 10)).pack(side="left", padx=5)
    search_entry = tk.Entry(top_frame, width=30)
    search_entry.pack(side="left", padx=5)

    def search_data():
        keyword = search_entry.get().strip()
        load_alert_data(keyword)

    tk.Button(top_frame, text="검색", command=search_data, width=8).pack(side="left", padx=5)
    tk.Button(top_frame, text="전체 보기", command=lambda: load_alert_data(), width=10).pack(side="left", padx=5)

    # 중간 프레임 - 테이블
    table_frame = tk.Frame(adjust_window, padx=10, pady=5)
    table_frame.pack(fill="both", expand=True)

    # 스크롤바
    scrollbar_y = tk.Scrollbar(table_frame, orient="vertical")
    scrollbar_x = tk.Scrollbar(table_frame, orient="horizontal")

    # Treeview (테이블) - alert 테이블의 컬럼에 맞게 조정
    columns = ("ID", "발전소명", "경고단계", "위도", "경도")
    tree = ttk.Treeview(table_frame, columns=columns, show="headings", 
                        yscrollcommand=scrollbar_y.set, xscrollcommand=scrollbar_x.set)

    # 컬럼 설정
    tree.heading("ID", text="ID")
    tree.heading("발전소명", text="발전소명")
    tree.heading("경고단계", text="경고단계")
    tree.heading("위도", text="위도")
    tree.heading("경도", text="경도")

    tree.column("ID", width=60, anchor="center")
    tree.column("발전소명", width=200, anchor="w")
    tree.column("경고단계", width=100, anchor="center")
    tree.column("위도", width=180, anchor="center")
    tree.column("경도", width=100, anchor="center")

    scrollbar_y.config(command=tree.yview)
    scrollbar_x.config(command=tree.xview)

    tree.pack(side="left", fill="both", expand=True)
    scrollbar_y.pack(side="right", fill="y")
    scrollbar_x.pack(side="bottom", fill="x")

    # 하단 프레임 - 수정 입력 필드
    bottom_frame = tk.Frame(adjust_window, padx=10, pady=10, relief="groove", borderwidth=2)
    bottom_frame.pack(fill="x")

    tk.Label(bottom_frame, text="경고단계 수정", font=("맑은 고딕", 11, "bold")).grid(row=0, column=0, columnspan=4, pady=5)

    tk.Label(bottom_frame, text="ID:").grid(row=1, column=0, sticky="e", padx=5, pady=5)
    id_entry = tk.Entry(bottom_frame, width=15, state="readonly")
    id_entry.grid(row=1, column=1, padx=5, pady=5)

    tk.Label(bottom_frame, text="발전소명:").grid(row=1, column=2, sticky="e", padx=5, pady=5)
    plant_entry = tk.Entry(bottom_frame, width=30, state="readonly")
    plant_entry.grid(row=1, column=3, padx=5, pady=5)

    tk.Label(bottom_frame, text="경고단계:").grid(row=2, column=0, sticky="e", padx=5, pady=5)
    
    # 경고단계 표시 및 조정 프레임
    alert_frame = tk.Frame(bottom_frame)
    alert_frame.grid(row=2, column=1, padx=5, pady=5)
    
    alert_level_var = tk.IntVar()
    alert_level_var.set(1)
    
    # 경고단계 1단계 내리기 버튼
    def decrease_alert():
        current = alert_level_var.get()
        if current > 1:
            alert_level_var.set(current - 1)
    
    # 경고단계 1단계 올리기 버튼
    def increase_alert():
        current = alert_level_var.get()
        if current < 10:
            alert_level_var.set(current + 1)
    
    tk.Button(alert_frame, text="◀", command=decrease_alert, width=3, 
              font=("맑은 고딕", 10, "bold")).pack(side="left", padx=2)
    
    alert_label = tk.Label(alert_frame, textvariable=alert_level_var, width=10,
                          relief="solid", borderwidth=2, font=("맑은 고딕", 14, "bold"))
    alert_label.pack(side="left", padx=2)
    
    tk.Button(alert_frame, text="▶", command=increase_alert, width=3,
              font=("맑은 고딕", 10, "bold")).pack(side="left", padx=2)

    tk.Label(bottom_frame, text="위도:").grid(row=2, column=2, sticky="e", padx=5, pady=5)
    time_entry = tk.Entry(bottom_frame, width=30, state="readonly")
    time_entry.grid(row=2, column=3, padx=5, pady=5)

    tk.Label(bottom_frame, text="경도:").grid(row=3, column=0, sticky="e", padx=5, pady=5)
    status_entry = tk.Entry(bottom_frame, width=15)
    status_entry.grid(row=3, column=1, padx=5, pady=5)

    # 데이터 로드 함수
    def load_alert_data(search_keyword=""):
        try:
            conn = psycopg2.connect(**DB_CONFIG)
            cur = conn.cursor()

            if search_keyword:
                query = """
                    SELECT id, 발전소명, 경고단계, latitude, longitude
                    FROM alert
                    WHERE 발전소명 ILIKE %s OR 경고단계 ILIKE %s
                    ORDER BY id DESC;
                """
                cur.execute(query, ('%{}%'.format(search_keyword), '%{}%'.format(search_keyword)))
            else:
                query = """
                    SELECT id, 발전소명, 경고단계, latitude, longitude
                    FROM alert
                    ORDER BY id DESC;
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
            
            plant_entry.config(state="normal")
            plant_entry.delete(0, tk.END)
            plant_entry.insert(0, values[1])
            plant_entry.config(state="readonly")
            
            # 경고단계를 숫자로 변환 (1-10 범위로 제한)
            try:
                alert_val = int(values[2]) if values[2] else 1
                alert_val = max(1, min(10, alert_val))
            except (ValueError, TypeError):
                alert_val = 1
            alert_level_var.set(alert_val)
            
            time_entry.config(state="normal")
            time_entry.delete(0, tk.END)
            time_entry.insert(0, values[3] if values[3] else "")
            time_entry.config(state="readonly")
            
            status_entry.delete(0, tk.END)
            status_entry.insert(0, values[4] if values[4] else "")

    tree.bind("<<TreeviewSelect>>", on_item_select)

    # 수정 저장 함수
    def save_alert_changes():
        selected = tree.selection()
        if not selected:
            messagebox.showwarning("경고", "수정할 항목을 선택하세요.")
            return

        record_id = id_entry.get()
        alert_level = alert_level_var.get()
        status = status_entry.get().strip()

        if not alert_level:
            messagebox.showwarning("경고", "경고단계를 선택하세요.")
            return

        try:
            conn = psycopg2.connect(**DB_CONFIG)
            cur = conn.cursor()

            query = """
                UPDATE alert
                SET 경고단계 = %s, longitude = %s
                WHERE id = %s;
            """
            cur.execute(query, (alert_level, status, record_id))
            conn.commit()

            messagebox.showinfo("성공", "경고단계 수정이 완료되었습니다.")
            load_alert_data()

            cur.close()
            conn.close()

        except psycopg2.Error as e:
            messagebox.showerror("오류", "수정에 실패했습니다.\n{}".format(e))

    # 버튼 프레임
    button_frame = tk.Frame(adjust_window, padx=10, pady=10)
    button_frame.pack()

    tk.Button(button_frame, text="수정 저장", command=save_alert_changes, width=12, height=2, 
              bg="#FF9800", fg="white", font=("맑은 고딕", 10, "bold")).pack(side="left", padx=5)
    tk.Button(button_frame, text="닫기", command=adjust_window.destroy, width=12, height=2,
              font=("맑은 고딕", 10)).pack(side="left", padx=5)

    # 초기 데이터 로드
    load_alert_data()


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
                     command=open_data_viewer, bg="#4CAF50", fg="white",
                     font=("맑은 고딕", 10, "bold"))
    btn2.grid(row=1, column=1, padx=10, pady=10)

    btn3 = tk.Button(frame, text="발전량 조정", width=15, height=2,
                     command=open_power_adjustment, bg="#FF9800", fg="white",
                     font=("맑은 고딕", 10, "bold"))
    btn3.grid(row=1, column=2, padx=10, pady=10)

    tk.Button(frame, text="종료", command=menu.destroy, width=10, height=1,
              font=("맑은 고딕", 9)).grid(row=2, column=0, columnspan=3, pady=10)

    menu.mainloop()


if __name__ == "__main__":
    root = tk.Tk()
    app = LoginApp(root)
    root.mainloop()