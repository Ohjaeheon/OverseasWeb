import os
import re
import shutil
import win32com.client

# 설정
PASSWORD = "gotjsqn"
TEMPLATE_NAME = "양식.xlsx"

def get_week_info(folder_name):
    """폴더명에서 주차 정보(예: 6월4주)를 추출하고, 없으면 폴더명 자체를 반환합니다."""
    match = re.search(r"(\d+월\s*\d+주)", folder_name)
    if match:
        return match.group(1).replace(" ", "")
    return folder_name

def find_target_sheet(filename, sheetnames):
    """
    지역별 엑셀 파일명(예: '01.도쿄_주간예배...')의 번호 접두사를 분석하여
    템플릿의 시트명(예: '1. 도쿄')과 매칭합니다.
    """
    basename = os.path.basename(filename)
    m = re.match(r"^(\d+)", basename)
    if not m:
        return None
    file_num = int(m.group(1))
    
    for sname in sheetnames:
        sm = re.match(r"^(\d+)", sname)
        if sm and int(sm.group(1)) == file_num:
            return sname
    return None

def copy_sheet_data_com(ws_src, ws_dst):
    """
    원본 시트(ws_src)의 데이터를 대상 시트(ws_dst)로 고속 복사합니다. (Excel COM 방식)
    수식 열을 제외한 5개의 데이터 입력 블록을 단 5번의 COM 호출로 한 번에 복사하여 속도를 극대화합니다.
    A1 셀의 날짜 정보도 복사하고 반환합니다.
    """
    extracted_date = None
    try:
        # A1 셀 (날짜 등) 복사
        a1_val = ws_src.Range("A1").Value
        ws_dst.Range("A1").Value = a1_val
        if a1_val:
            # 괄호 속 날짜 추출 (예: (7월 1일 수요일))
            m = re.search(r"(\([^)]+\))", str(a1_val))
            if m:
                extracted_date = m.group(1)

        # C6:W13 범위의 모든 데이터 값을 한 번에 가져옴 (8개 행, 21개 열)
        src_values = ws_src.Range("C6:W13").Value
        if not src_values:
            return None
            
        # 튜플 데이터를 다루기 편하게 리스트로 변환
        src_list = [list(row) for row in src_values]
        
        # 1. 블록 1: C6:F13 (C:등록, D:대면, E:온라인, F:기타) - 인덱스 0~3 (4개 열)
        ws_dst.Range("C6:F13").Value = [row[0:4] for row in src_list]
        
        # 2. 블록 2: I6:K13 (I:총재적, J:출결제외/근신, K:등록재적) - 인덱스 6~8 (3개 열, G/H 수식 제외)
        ws_dst.Range("I6:K13").Value = [row[6:9] for row in src_list]
        
        # 3. 블록 3: L6:N13 (L:대면, M:온라인, N:기타) - 인덱스 9~11 (3개 열)
        ws_dst.Range("L6:N13").Value = [row[9:12] for row in src_list]
        
        # 4. 블록 4: Q6:S13 (Q:미출석재적, R:미출석대면, S:미출석온라인) - 인덱스 14~16 (3개 열, O/P 수식 제외)
        ws_dst.Range("Q6:S13").Value = [row[14:17] for row in src_list]
        
        # 5. 블록 5: V6:W13 (V:미출석률/미출석기타일부, W:비고) - 인덱스 19~20 (2개 열, T/U 수식 제외)
        ws_dst.Range("V6:W13").Value = [row[19:21] for row in src_list]
        
    except Exception as e:
        print(f"    [오류] 데이터 블록 고속 복사 중 실패: {e}")
    return extracted_date

def update_common_sheets_date(wb, new_date):
    """공통 시트(해외-전체예배출석현황, 해외-자장부청)의 A1 셀 날짜 부분을 업데이트합니다."""
    for sname in ["해외-전체예배출석현황", "해외-자장부청"]:
        try:
            sh = wb.Sheets(sname)
            a1_val = sh.Range("A1").Value
            if a1_val:
                # 기존의 괄호 부분을 새 날짜로 치환
                updated_val = re.sub(r"\([^)]+\)", new_date, str(a1_val))
                sh.Range("A1").Value = updated_val
                print(f"    [공통] '{sname}' A1 날짜 업데이트 완료: {new_date}")
        except Exception as e:
            print(f"    [경고] '{sname}' A1 날짜 업데이트 중 오류: {e}")

def process_merge():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    template_path = os.path.join(base_dir, TEMPLATE_NAME)
    
    if not os.path.exists(template_path):
        print(f"[오류] 메인 경로에 '{TEMPLATE_NAME}' 파일이 존재하지 않습니다.")
        return

    # 하위 폴더 탐색
    subfolders = []
    for entry in os.scandir(base_dir):
        if entry.is_dir() and not entry.name.startswith('.'):
            # 파일 번호(01.~19.)로 시작하는 파일이 들어있는 폴더인지 확인
            has_regional = False
            for f in os.scandir(entry.path):
                if f.is_file() and f.name.endswith('.xlsx'):
                    if re.match(r'^\d+\.', f.name):
                        has_regional = True
                        break
            if has_regional:
                subfolders.append(entry)
                
    if not subfolders:
        print("[정보] 작업 대상이 되는 하위 폴더를 찾지 못했습니다.")
        return
        
    print(f"[정보] 총 {len(subfolders)}개의 작업 대상 폴더 발견: {[f.name for f in subfolders]}")
    
    excel = None
    try:
        # Excel 백그라운드 어플리케이션 시작
        print("[진행] Excel 어플리케이션을 구동하여 고속 취합을 시작합니다...")
        excel = win32com.client.Dispatch("Excel.Application")
        excel.Visible = False
        excel.DisplayAlerts = False
        excel.ScreenUpdating = False
        
        for folder in subfolders:
            folder_name = folder.name
            week_info = get_week_info(folder_name)
            print(f"\n==================================================")
            print(f" 작업 시작: {folder_name} (추출된 주차: {week_info})")
            print(f"==================================================")
            
            final_주일_enc = os.path.join(folder.path, f"해외-예배출결현황({week_info})_주일.xlsx")
            final_수요_enc = os.path.join(folder.path, f"해외-예배출결현황({week_info})_수요.xlsx")
            
            # 결과 파일이 열려있는지 권한 체크 및 사전 비우기
            try:
                if os.path.exists(final_주일_enc):
                    os.remove(final_주일_enc)
                if os.path.exists(final_수요_enc):
                    os.remove(final_수요_enc)
            except PermissionError:
                print(f"[오류] 취합 결과 파일이 이미 열려 있어 접근할 수 없습니다.")
                print(f"작업 폴더 내의 '해외-예배출결현황({week_info})' 엑셀 창을 완전히 닫고 다시 실행해 주세요.")
                return
            
            # 템플릿 복사본 생성 (암호화 상태 유지)
            shutil.copy(template_path, final_주일_enc)
            shutil.copy(template_path, final_수요_enc)
            
            # 취합 대상 파일 열기 (위치 인수 사용: Filename, UpdateLinks, ReadOnly, Format, Password)
            wb_주일 = excel.Workbooks.Open(final_주일_enc, 0, False, None, PASSWORD)
            wb_수요 = excel.Workbooks.Open(final_수요_enc, 0, False, None, PASSWORD)
            
            # 하위 폴더 내 19개 지역별 파일 목록
            regional_files = [f.name for f in os.scandir(folder.path) 
                              if f.is_file() and f.name.endswith('.xlsx') and re.match(r'^\d+\.', f.name)]
            regional_files.sort()
            
            print(f"[정보] '{folder_name}' 폴더 내 지역별 파일 개수: {len(regional_files)}개")
            
            dest_sheetnames = [sh.Name for sh in wb_주일.Sheets]
            
            extracted_date_주일 = None
            extracted_date_수요 = None
            
            for r_file in regional_files:
                r_path = os.path.join(folder.path, r_file)
                
                wb_src = None
                try:
                    # 지역별 파일 열기 (위치 인수 사용: Filename, UpdateLinks, ReadOnly, Format, Password)
                    wb_src = excel.Workbooks.Open(r_path, 0, True, None, PASSWORD)
                    
                    # 템플릿 시트 매칭
                    dst_sheet_name = find_target_sheet(r_file, dest_sheetnames)
                    if not dst_sheet_name:
                        print(f"  [경고] '{r_file}' 매칭되는 템플릿 시트를 찾을 수 없어 건너뜁니다.")
                        wb_src.Close(False)
                        continue
                    
                    # 주일 취합
                    has_주일 = False
                    for sh in wb_src.Sheets:
                        if sh.Name == "(주일)예배출석현황":
                            has_주일 = True
                            date_found = copy_sheet_data_com(sh, wb_주일.Sheets(dst_sheet_name))
                            if date_found:
                                extracted_date_주일 = date_found
                            print(f"  [완료] '{r_file}' -> '{dst_sheet_name}' (주일) 값 병합 완료")
                            break
                    if not has_주일:
                        print(f"  [정보] '{r_file}' 파일에 '(주일)예배출석현황' 시트가 없어 해당 국가(시트)는 건너뜁니다.")
                        
                    # 수요 취합
                    has_수요 = False
                    for sh in wb_src.Sheets:
                        if sh.Name == "(수요)예배출석현황":
                            has_수요 = True
                            date_found = copy_sheet_data_com(sh, wb_수요.Sheets(dst_sheet_name))
                            if date_found:
                                extracted_date_수요 = date_found
                            print(f"  [완료] '{r_file}' -> '{dst_sheet_name}' (수요) 값 병합 완료")
                            break
                    if not has_수요:
                        print(f"  [정보] '{r_file}' 파일에 '(수요)예배출석현황' 시트가 없어 해당 국가(시트)는 건너뜁니다.")
                        
                except Exception as e:
                    print(f"  [오류] '{r_file}' 파일 처리 중 에러 발생: {e}")
                finally:
                    if wb_src is not None:
                        try:
                            wb_src.Close(False)
                        except Exception:
                            pass
            
            # 공통 시트 날짜 업데이트
            if extracted_date_주일:
                update_common_sheets_date(wb_주일, extracted_date_주일)
            if extracted_date_수요:
                update_common_sheets_date(wb_수요, extracted_date_수요)

            # 저장 후 닫기
            wb_주일.Close(True)
            wb_수요.Close(True)
            print(f"  [성공] 생성 완료: {os.path.basename(final_주일_enc)}")
            print(f"  [성공] 생성 완료: {os.path.basename(final_수요_enc)}")
            
    except Exception as e:
        print(f"[오류] 대형 에러 발생: {e}")
    finally:
        # Excel 프로세스 강제 종료 방지 및 안전하게 닫기
        if excel is not None:
            try:
                excel.Quit()
            except Exception:
                pass
                
    print("\n[알림] 모든 취합 작업이 성료되었습니다!")

if __name__ == "__main__":
    process_merge()
