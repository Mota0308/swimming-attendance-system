#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
複製批量操作函數從提取文件到主文件 - 改進版
"""

def copy_batch_functions():
    print("=" * 70)
    print("開始複製批量操作函數...")
    print("=" * 70)
    
    # 讀取源文件
    print("\n📖 讀取源文件...")
    with open('Web_app/batch-operation-extraction/batch-operation-supervisor.js', 'r', encoding='utf-8') as f:
        source_content = f.read()
    print(f"   源文件大小: {len(source_content)} 字符")
    
    # 讀取目標文件
    print("\n📖 讀取目標文件...")
    with open('Web_app/supervisor-functions.js', 'r', encoding='utf-8') as f:
        target_content = f.read()
    print(f"   目標文件大小: {len(target_content)} 字符")
    
    # 方法1: 搜索批量操作全局變量聲明
    print("\n🔍 搜索批量操作代碼開始位置...")
    
    # 嘗試多個可能的開始標記
    start_markers = [
        "// 批量操作全局变量",
        "let batchWorkSelectedDates = new Set();",
        "// ==================== 批量操作功能",
        "function openBatchOperationModal()"
    ]
    
    batch_start_index = -1
    used_marker = None
    
    for marker in start_markers:
        batch_start_index = source_content.find(marker)
        if batch_start_index != -1:
            used_marker = marker
            print(f"   ✅ 找到開始標記: {marker}")
            print(f"   位置: {batch_start_index}")
            break
    
    if batch_start_index == -1:
        print("   ❌ 無法找到批量操作代碼的開始位置")
        print("\n嘗試搜索的標記:")
        for marker in start_markers:
            print(f"   - {marker}")
        return False
    
    # 找到結束位置 - 搜索函數導出部分
    print("\n🔍 搜索批量操作代碼結束位置...")
    
    end_markers = [
        "window.onBatchDateRangeChange = onBatchDateRangeChange;",
        "window.batchNavigateMonth = batchNavigateMonth;",
        "window.openBatchOperationModal = openBatchOperationModal;"
    ]
    
    batch_end_index = -1
    
    for marker in end_markers:
        temp_index = source_content.find(marker, batch_start_index)
        if temp_index != -1:
            # 找到這行的結尾
            line_end = source_content.find('\n', temp_index)
            if line_end != -1:
                batch_end_index = line_end + 1
                print(f"   ✅ 找到結束標記: {marker}")
                print(f"   位置: {batch_end_index}")
                break
    
    if batch_end_index == -1:
        print("   ❌ 無法找到批量操作代碼的結束位置")
        return False
    
    # 提取批量操作代碼
    print("\n📋 提取批量操作代碼...")
    batch_functions = source_content[batch_start_index:batch_end_index].strip()
    print(f"   代碼長度: {len(batch_functions)} 字符")
    line_count = len(batch_functions.split('\n'))
    print(f"   約 {line_count} 行")
    
    # 在目標文件中找到插入位置
    print("\n🔍 搜索目標文件插入位置...")
    
    # 搜索 window.openBatchOperationModal 之前
    insert_markers = [
        "window.openBatchOperationModal = openBatchOperationModal;",
        "// 导出函数到全局作用域"
    ]
    
    insert_index = -1
    
    for marker in insert_markers:
        insert_index = target_content.find(marker)
        if insert_index != -1:
            print(f"   ✅ 找到插入標記: {marker}")
            print(f"   位置: {insert_index}")
            break
    
    if insert_index == -1:
        print("   ❌ 無法找到插入位置")
        return False
    
    # 檢查是否已有批量操作代碼
    print("\n🔍 檢查是否已有批量操作代碼...")
    check_markers = [
        "function onBatchDateRangeChange()",
        "let batchWorkSelectedDates",
        "批量操作"
    ]
    
    has_existing = False
    existing_start = -1
    
    for marker in check_markers:
        temp_index = target_content.find(marker)
        if temp_index != -1 and temp_index < insert_index:
            has_existing = True
            if existing_start == -1 or temp_index < existing_start:
                existing_start = temp_index
            print(f"   ⚠️  發現現有代碼: {marker} (位置: {temp_index})")
    
    # 構建新內容
    print("\n🔨 構建新內容...")
    
    if has_existing:
        print("   ⚠️  將替換現有的批量操作代碼")
        # 刪除現有代碼並插入新代碼
        new_content = (
            target_content[:existing_start] + 
            "\n" + batch_functions + "\n\n" + 
            target_content[insert_index:]
        )
    else:
        print("   ✅ 將插入新的批量操作代碼")
        # 插入新代碼
        new_content = (
            target_content[:insert_index] + 
            batch_functions + "\n\n" + 
            target_content[insert_index:]
        )
    
    print(f"   新文件大小: {len(new_content)} 字符")
    
    # 備份原文件
    print("\n💾 備份原文件...")
    import shutil
    import datetime
    
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = f'Web_app/supervisor-functions.js.backup_{timestamp}'
    shutil.copy2('Web_app/supervisor-functions.js', backup_path)
    print(f"   ✅ 已備份到: {backup_path}")
    
    # 寫入新內容
    print("\n💾 寫入新內容...")
    with open('Web_app/supervisor-functions.js', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("   ✅ 寫入成功")
    
    # 驗證
    print("\n✅ 驗證新文件...")
    with open('Web_app/supervisor-functions.js', 'r', encoding='utf-8') as f:
        verify_content = f.read()
    
    # 檢查關鍵函數是否存在
    key_functions = [
        "function onBatchDateRangeChange()",
        "function selectBatchOperationType(",
        "function addBatchFillTimeSlot()",
        "function generateBatchOperationCalendarForDateRange()"
    ]
    
    all_found = True
    for func in key_functions:
        if func in verify_content:
            print(f"   ✅ 找到: {func}")
        else:
            print(f"   ❌ 缺失: {func}")
            all_found = False
    
    if all_found:
        print("\n" + "=" * 70)
        print("✅ 批量操作函數複製成功！")
        print("=" * 70)
        print("\n請執行以下步驟：")
        print("1. 刷新瀏覽器頁面 (Ctrl + F5)")
        print("2. 測試批量操作功能")
        print("3. 如有問題，可以從備份文件恢復")
        print(f"   備份文件: {backup_path}")
        return True
    else:
        print("\n" + "=" * 70)
        print("⚠️  複製完成但部分函數可能缺失")
        print("=" * 70)
        return False

if __name__ == "__main__":
    try:
        success = copy_batch_functions()
        if not success:
            print("\n❌ 複製失敗，請檢查錯誤信息")
            exit(1)
    except Exception as e:
        print(f"\n❌ 發生錯誤：{e}")
        import traceback
        traceback.print_exc()
        exit(1)




"""
複製批量操作函數從提取文件到主文件 - 改進版
"""

def copy_batch_functions():
    print("=" * 70)
    print("開始複製批量操作函數...")
    print("=" * 70)
    
    # 讀取源文件
    print("\n📖 讀取源文件...")
    with open('Web_app/batch-operation-extraction/batch-operation-supervisor.js', 'r', encoding='utf-8') as f:
        source_content = f.read()
    print(f"   源文件大小: {len(source_content)} 字符")
    
    # 讀取目標文件
    print("\n📖 讀取目標文件...")
    with open('Web_app/supervisor-functions.js', 'r', encoding='utf-8') as f:
        target_content = f.read()
    print(f"   目標文件大小: {len(target_content)} 字符")
    
    # 方法1: 搜索批量操作全局變量聲明
    print("\n🔍 搜索批量操作代碼開始位置...")
    
    # 嘗試多個可能的開始標記
    start_markers = [
        "// 批量操作全局变量",
        "let batchWorkSelectedDates = new Set();",
        "// ==================== 批量操作功能",
        "function openBatchOperationModal()"
    ]
    
    batch_start_index = -1
    used_marker = None
    
    for marker in start_markers:
        batch_start_index = source_content.find(marker)
        if batch_start_index != -1:
            used_marker = marker
            print(f"   ✅ 找到開始標記: {marker}")
            print(f"   位置: {batch_start_index}")
            break
    
    if batch_start_index == -1:
        print("   ❌ 無法找到批量操作代碼的開始位置")
        print("\n嘗試搜索的標記:")
        for marker in start_markers:
            print(f"   - {marker}")
        return False
    
    # 找到結束位置 - 搜索函數導出部分
    print("\n🔍 搜索批量操作代碼結束位置...")
    
    end_markers = [
        "window.onBatchDateRangeChange = onBatchDateRangeChange;",
        "window.batchNavigateMonth = batchNavigateMonth;",
        "window.openBatchOperationModal = openBatchOperationModal;"
    ]
    
    batch_end_index = -1
    
    for marker in end_markers:
        temp_index = source_content.find(marker, batch_start_index)
        if temp_index != -1:
            # 找到這行的結尾
            line_end = source_content.find('\n', temp_index)
            if line_end != -1:
                batch_end_index = line_end + 1
                print(f"   ✅ 找到結束標記: {marker}")
                print(f"   位置: {batch_end_index}")
                break
    
    if batch_end_index == -1:
        print("   ❌ 無法找到批量操作代碼的結束位置")
        return False
    
    # 提取批量操作代碼
    print("\n📋 提取批量操作代碼...")
    batch_functions = source_content[batch_start_index:batch_end_index].strip()
    print(f"   代碼長度: {len(batch_functions)} 字符")
    line_count = len(batch_functions.split('\n'))
    print(f"   約 {line_count} 行")
    
    # 在目標文件中找到插入位置
    print("\n🔍 搜索目標文件插入位置...")
    
    # 搜索 window.openBatchOperationModal 之前
    insert_markers = [
        "window.openBatchOperationModal = openBatchOperationModal;",
        "// 导出函数到全局作用域"
    ]
    
    insert_index = -1
    
    for marker in insert_markers:
        insert_index = target_content.find(marker)
        if insert_index != -1:
            print(f"   ✅ 找到插入標記: {marker}")
            print(f"   位置: {insert_index}")
            break
    
    if insert_index == -1:
        print("   ❌ 無法找到插入位置")
        return False
    
    # 檢查是否已有批量操作代碼
    print("\n🔍 檢查是否已有批量操作代碼...")
    check_markers = [
        "function onBatchDateRangeChange()",
        "let batchWorkSelectedDates",
        "批量操作"
    ]
    
    has_existing = False
    existing_start = -1
    
    for marker in check_markers:
        temp_index = target_content.find(marker)
        if temp_index != -1 and temp_index < insert_index:
            has_existing = True
            if existing_start == -1 or temp_index < existing_start:
                existing_start = temp_index
            print(f"   ⚠️  發現現有代碼: {marker} (位置: {temp_index})")
    
    # 構建新內容
    print("\n🔨 構建新內容...")
    
    if has_existing:
        print("   ⚠️  將替換現有的批量操作代碼")
        # 刪除現有代碼並插入新代碼
        new_content = (
            target_content[:existing_start] + 
            "\n" + batch_functions + "\n\n" + 
            target_content[insert_index:]
        )
    else:
        print("   ✅ 將插入新的批量操作代碼")
        # 插入新代碼
        new_content = (
            target_content[:insert_index] + 
            batch_functions + "\n\n" + 
            target_content[insert_index:]
        )
    
    print(f"   新文件大小: {len(new_content)} 字符")
    
    # 備份原文件
    print("\n💾 備份原文件...")
    import shutil
    import datetime
    
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = f'Web_app/supervisor-functions.js.backup_{timestamp}'
    shutil.copy2('Web_app/supervisor-functions.js', backup_path)
    print(f"   ✅ 已備份到: {backup_path}")
    
    # 寫入新內容
    print("\n💾 寫入新內容...")
    with open('Web_app/supervisor-functions.js', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("   ✅ 寫入成功")
    
    # 驗證
    print("\n✅ 驗證新文件...")
    with open('Web_app/supervisor-functions.js', 'r', encoding='utf-8') as f:
        verify_content = f.read()
    
    # 檢查關鍵函數是否存在
    key_functions = [
        "function onBatchDateRangeChange()",
        "function selectBatchOperationType(",
        "function addBatchFillTimeSlot()",
        "function generateBatchOperationCalendarForDateRange()"
    ]
    
    all_found = True
    for func in key_functions:
        if func in verify_content:
            print(f"   ✅ 找到: {func}")
        else:
            print(f"   ❌ 缺失: {func}")
            all_found = False
    
    if all_found:
        print("\n" + "=" * 70)
        print("✅ 批量操作函數複製成功！")
        print("=" * 70)
        print("\n請執行以下步驟：")
        print("1. 刷新瀏覽器頁面 (Ctrl + F5)")
        print("2. 測試批量操作功能")
        print("3. 如有問題，可以從備份文件恢復")
        print(f"   備份文件: {backup_path}")
        return True
    else:
        print("\n" + "=" * 70)
        print("⚠️  複製完成但部分函數可能缺失")
        print("=" * 70)
        return False

if __name__ == "__main__":
    try:
        success = copy_batch_functions()
        if not success:
            print("\n❌ 複製失敗，請檢查錯誤信息")
            exit(1)
    except Exception as e:
        print(f"\n❌ 發生錯誤：{e}")
        import traceback
        traceback.print_exc()
        exit(1)












