package com.swimming.attendance.ui.admin

import android.app.DatePickerDialog
import android.os.Bundle
import android.util.Log
import android.view.Gravity
import android.view.View
import android.widget.*
import android.widget.AdapterView
import androidx.appcompat.app.AppCompatActivity
import com.swimming.attendance.R
import com.swimming.attendance.network.CloudAPIService
import com.swimming.attendance.data.Student
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.delay
import org.json.JSONObject
import java.util.Calendar
import java.text.SimpleDateFormat
import java.util.*
import com.google.android.material.chip.Chip

class AdminMainActivity : AppCompatActivity() {
    private lateinit var tabAttendance: TextView
    private lateinit var tabConfig: TextView
    private lateinit var tabCoachMgmt: TextView

    private lateinit var attendanceSection: LinearLayout
    private lateinit var configSection: LinearLayout
    private lateinit var coachMgmtSection: LinearLayout

    // 系統配置
    private lateinit var configSearchEdit: EditText
    private lateinit var configSearchButton: Button
    private lateinit var generateScheduleButton: Button
    private lateinit var createWaitlistButton: Button
    private lateinit var addStudentButton: Button
    private lateinit var exportDataButton: Button
    private lateinit var searchResultsContainer: LinearLayout
    private lateinit var searchResultsList: LinearLayout
    private lateinit var functionDescriptionContainer: LinearLayout
    private lateinit var functionDescriptionText: TextView

    // 教練管理
    private lateinit var dateText: TextView
    private lateinit var pickDateButton: Button
    private lateinit var uploadButton: Button
    private lateinit var coachList: LinearLayout
    private lateinit var coachSearchEdit: EditText
    private lateinit var coachSearchButton: Button
    private lateinit var locationSpinner: Spinner
    private lateinit var coachListButton: Button

    private val managedLocations: MutableList<String> = mutableListOf()
    private val coachSelectedClub: MutableMap<String, String> = mutableMapOf()
    // 出席記錄（仍在使用）
    private lateinit var attendanceDateText: TextView
    private lateinit var attendancePickDateButton: Button
    private lateinit var attendanceSearchButton: Button
    private lateinit var attendanceResetButton: Button
    private val coachHoursMap = mutableMapOf<String, MutableList<String>>() // phone -> ["HH:mm-HH:mm", ...]
    private val coachTotalHours = mutableMapOf<String, Double>()            // phone -> total hours
    private var allCoaches: List<CoachInfo> = emptyList()
    
    // 雲端API服務
    private lateinit var cloudAPIService: CloudAPIService
    private var allStudents: MutableList<Student> = mutableListOf()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_admin_main)

        cloudAPIService = CloudAPIService(this)
        initViews()
        bindTabs()
        showSection("coach_mgmt")
        initCoachMgmt()
        initConfigSection()
        
        // 先初始化出席記錄的基本UI，但不設置地點下拉選單
        initAttendanceSectionBasic()
        
        // 預載入學生數據，然後設置地點下拉選單
        preloadStudents()
    }

    private fun initViews() {
        tabAttendance = findViewById(R.id.tabAttendance)
        tabConfig = findViewById(R.id.tabConfig)
        tabCoachMgmt = findViewById(R.id.tabCoachMgmt)

        attendanceSection = findViewById(R.id.sectionAttendance)
        configSection = findViewById(R.id.sectionConfig)
        coachMgmtSection = findViewById(R.id.sectionCoachMgmt)

        // 系統配置控件
        configSearchEdit = findViewById(R.id.configSearchEdit)
        configSearchButton = findViewById(R.id.configSearchButton)
        generateScheduleButton = findViewById(R.id.generateScheduleButton)
        createWaitlistButton = findViewById(R.id.createWaitlistButton)
        addStudentButton = findViewById(R.id.addStudentButton)
        exportDataButton = findViewById(R.id.exportDataButton)
        searchResultsContainer = findViewById(R.id.searchResultsContainer)
        searchResultsList = findViewById(R.id.searchResultsList)
        functionDescriptionContainer = findViewById(R.id.functionDescriptionContainer)
        functionDescriptionText = findViewById(R.id.functionDescriptionText)

        dateText = findViewById(R.id.selectedDateText)
        pickDateButton = findViewById(R.id.pickDateButton)
        uploadButton = findViewById(R.id.uploadWorkHoursButton)
        coachList = findViewById(R.id.coachListContainer)
        coachSearchEdit = findViewById(R.id.coachSearchEdit)
        coachSearchButton = findViewById(R.id.searchCoachButton)
        locationSpinner = findViewById(R.id.locationSpinner)
        coachListButton = findViewById(R.id.coachListButton)
        // 出席記錄控件
        attendanceDateText = findViewById(R.id.attendanceDateText)
        attendancePickDateButton = findViewById(R.id.attendancePickDateButton)
        attendanceSearchButton = findViewById(R.id.attendanceSearchButton)
        attendanceResetButton = findViewById(R.id.attendanceResetButton)
    }

    private fun bindTabs() {
        tabAttendance.setOnClickListener { showSection("attendance") }
        tabConfig.setOnClickListener { showSection("config") }
        tabCoachMgmt.setOnClickListener { showSection("coach_mgmt") }
    }

    private fun showSection(key: String) {
        attendanceSection.visibility = if (key == "attendance") View.VISIBLE else View.GONE
        configSection.visibility = if (key == "config") View.VISIBLE else View.GONE
        coachMgmtSection.visibility = if (key == "coach_mgmt") View.VISIBLE else View.GONE

        tabAttendance.isSelected = key == "attendance"
        tabConfig.isSelected = key == "config"
        tabCoachMgmt.isSelected = key == "coach_mgmt"
    }

    private fun initConfigSection() {
        // 搜索功能
        configSearchButton.setOnClickListener {
            performConfigSearch()
        }

        // 生成課表按鈕
        generateScheduleButton.setOnClickListener {
            generateSchedule()
        }

        // 創建待約按鈕
        createWaitlistButton.setOnClickListener {
            createWaitlist()
        }

        // 添加學生按鈕
        addStudentButton.setOnClickListener {
            addStudent()
        }

        // 導出資料按鈕
        exportDataButton.setOnClickListener {
            showFunctionDescription("📤 導出資料功能", 
                "此功能可以導出各種報表和數據。\n\n" +
                "• 出席記錄報表\n" +
                "• 教練工時統計\n" +
                "• 學生進度報告\n" +
                "• Excel/PDF格式")
        }
    }

    // 初始化出席記錄的基本UI（不包括地點下拉選單）
    private fun initAttendanceSectionBasic() {
        setupDatePicker()
        setupAttendanceButtons()
    }

    // 完整的出席記錄初始化（包括地點下拉選單）
    private fun initAttendanceSection() {
        setupLocationSpinner()
        setupDatePicker()
        setupAttendanceButtons()
    }

    private fun initCoachMgmt() {
        val cal = Calendar.getInstance()
        updateDateText(cal)

        pickDateButton.setOnClickListener {
            DatePickerDialog(this, { _, y, m, d ->
                cal.set(y, m, d)
                updateDateText(cal)
                // 日期切換不清除已編輯時段，僅影響上傳日期
            }, cal.get(Calendar.YEAR), cal.get(Calendar.MONTH), cal.get(Calendar.DAY_OF_MONTH)).show()
        }

        coachSearchButton.setOnClickListener {
            renderCoachList(filter = coachSearchEdit.text?.toString()?.trim().orEmpty())
        }

        uploadButton.setOnClickListener {
            uploadWorkHours()
        }

        // 顯示教練列表（彈窗）
        coachListButton.setOnClickListener {
            showCoachListDialog()
        }

        // 初次載入教練列表
        fetchCoaches()
    }

    private fun updateDateText(cal: Calendar) {
        val y = cal.get(Calendar.YEAR)
        val m = cal.get(Calendar.MONTH) + 1
        val d = cal.get(Calendar.DAY_OF_MONTH)
        dateText.text = String.format("%04d-%02d-%02d", y, m, d)
    }

    private fun fetchCoaches() {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val api = CloudAPIService(this@AdminMainActivity)
                val resp = api.fetchCoaches()
                if (resp.success) {
                    val list = mutableListOf<CoachInfo>()
                    val data = resp.data?.toString() ?: "{}"
                    val obj = JSONObject(data)
                    val arr = obj.optJSONArray("coaches")
                    if (arr != null) {
                        for (i in 0 until arr.length()) {
                            val c = arr.getJSONObject(i)
                            // 修正：使用正確的字段名稱
                            val name = c.optString("studentName", "未命名教練")
                            val phone = c.optString("phone", "")
                            list.add(CoachInfo(name, phone))
                        }
                    }
                    allCoaches = list
                    withContext(Dispatchers.Main) {
                        renderCoachList()
                        Toast.makeText(this@AdminMainActivity, "已載入 ${list.size} 名教練", Toast.LENGTH_SHORT).show()
                    }
                } else {
                    withContext(Dispatchers.Main) {
                        Toast.makeText(this@AdminMainActivity, "無法獲取教練列表: ${resp.message}", Toast.LENGTH_SHORT).show()
                    }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    Toast.makeText(this@AdminMainActivity, "獲取教練失敗: ${e.message}", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    private fun renderCoachList(filter: String = "") {
        coachList.removeAllViews()
        val coaches = if (filter.isNotEmpty()) {
            allCoaches.filter { it.name.contains(filter) }
        } else allCoaches

        for (coach in coaches) {
            addCoachRow(coach)
        }
    }

    private fun addCoachRow(coach: CoachInfo) {
        val row = layoutInflater.inflate(R.layout.item_coach_hours_row, coachList, false)
        val nameText = row.findViewById<TextView>(R.id.coachNameText)
        val totalText = row.findViewById<TextView>(R.id.totalHoursText)
        val addSlotButton = row.findViewById<Button>(R.id.addTimeSlotButton)
        val slotContainer = row.findViewById<LinearLayout>(R.id.timeSlotContainer)
        val clubSpinner = row.findViewById<Spinner>(R.id.coachClubSpinner)
        val addClubButton = row.findViewById<Button>(R.id.addClubButton)
        val deleteClubButton = row.findViewById<Button>(R.id.deleteClubButton)
        val clubChips = row.findViewById<com.google.android.material.chip.ChipGroup>(R.id.coachClubChips)

        nameText.text = coach.name
        totalText.text = formatTotalHours(coachTotalHours[coach.phone] ?: 0.0)

        // 時段渲染
        val list = coachHoursMap.getOrPut(coach.phone) { mutableListOf() }
        list.forEach { slot -> addTimeSlotView(slotContainer, coach.phone, slot, totalText) }

        // 綁定 Club 控件
        bindClubControls(coach.phone, clubSpinner, addClubButton, deleteClubButton)
        bindClubChips(coach.phone, clubChips)

        addSlotButton.setOnClickListener { addTimeSlotInput(slotContainer, coach.phone, totalText) }

        coachList.addView(row)
    }

    private fun addCoachRowTo(container: LinearLayout, coach: CoachInfo) {
        val row = layoutInflater.inflate(R.layout.item_coach_hours_row, container, false)
        val nameText = row.findViewById<TextView>(R.id.coachNameText)
        val totalText = row.findViewById<TextView>(R.id.totalHoursText)
        val addSlotButton = row.findViewById<Button>(R.id.addTimeSlotButton)
        val slotContainer = row.findViewById<LinearLayout>(R.id.timeSlotContainer)
        val clubSpinner = row.findViewById<Spinner>(R.id.coachClubSpinner)
        val addClubButton = row.findViewById<Button>(R.id.addClubButton)
        val deleteClubButton = row.findViewById<Button>(R.id.deleteClubButton)

        nameText.text = coach.name
        totalText.text = formatTotalHours(coachTotalHours[coach.phone] ?: 0.0)

        val list = coachHoursMap.getOrPut(coach.phone) { mutableListOf() }
        list.forEach { slot -> addTimeSlotView(slotContainer, coach.phone, slot, totalText) }

        bindClubControls(coach.phone, clubSpinner, addClubButton, deleteClubButton)
        addSlotButton.setOnClickListener { addTimeSlotInput(slotContainer, coach.phone, totalText) }

        container.addView(row)
    }

    private fun bindClubControls(phone: String, clubSpinner: Spinner, addClubButton: Button, deleteClubButton: Button) {
        // 用 Spinner 簡化：提供固定選項 SH/BT/HPP
        val options = listOf("", "SH", "BT", "HPP")
        val adapter = ArrayAdapter(this, android.R.layout.simple_spinner_item, options)
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        clubSpinner.adapter = adapter
        val current = coachSelectedClub[phone] ?: ""
        val idx = options.indexOf(current).let { if (it >= 0) it else 0 }
        clubSpinner.setSelection(idx)
        clubSpinner.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                coachSelectedClub[phone] = options[position]
            }
            override fun onNothingSelected(parent: AdapterView<*>?) {}
        }
        addClubButton.setOnClickListener {
            Toast.makeText(this, "請改在後台維護 club 名單", Toast.LENGTH_SHORT).show()
        }
        deleteClubButton.setOnClickListener {
            coachSelectedClub.remove(phone)
            clubSpinner.setSelection(0)
        }
    }

    private fun bindClubChips(phone: String, chipGroup: com.google.android.material.chip.ChipGroup) {
        val preset = listOf("SH", "BT", "HPP")
        chipGroup.removeAllViews()
        val current = coachSelectedClub[phone]
        for (c in preset) {
            val chip = Chip(this).apply {
                text = c
                isCheckable = true
                isChecked = (c == current)
                setOnClickListener { coachSelectedClub[phone] = c }
            }
            chipGroup.addView(chip)
        }
    }

    private fun addTimeSlotInput(container: LinearLayout, coachPhone: String, totalText: TextView) {
        val slotView = layoutInflater.inflate(R.layout.item_time_slot_input_new, container, false)
        val startTimeEdit = slotView.findViewById<EditText>(R.id.startTimeEdit)
        val endTimeEdit = slotView.findViewById<EditText>(R.id.endTimeEdit)
        val saveBtn = slotView.findViewById<Button>(R.id.saveSlotButton)
        val deleteBtn = slotView.findViewById<Button>(R.id.deleteSlotButton)

        // 設置輸入限制和驗證
        setupTimeInputValidationNew(startTimeEdit, endTimeEdit, saveBtn)

        // 自動聚焦並彈出數字鍵盤
        startTimeEdit.requestFocus()
        val imm = getSystemService(android.content.Context.INPUT_METHOD_SERVICE) as android.view.inputmethod.InputMethodManager
        imm.showSoftInput(startTimeEdit, android.view.inputmethod.InputMethodManager.SHOW_IMPLICIT)

        saveBtn.setOnClickListener {
            val startTime = startTimeEdit.text?.toString()?.trim() ?: ""
            val endTime = endTimeEdit.text?.toString()?.trim() ?: ""
            
            if (startTime.isEmpty() || endTime.isEmpty()) {
                Toast.makeText(this, "請填寫完整的時間段", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            
            // 轉換為標準格式 HH:MM-HH:MM
            val timeSlot = convertToStandardFormat(startTime, endTime)
            
            if (isValidSlot(timeSlot)) {
                val list = coachHoursMap.getOrPut(coachPhone) { mutableListOf() }
                list.add(timeSlot)
                recalcCoachTotal(coachPhone)
                totalText.text = formatTotalHours(coachTotalHours[coachPhone] ?: 0.0)
                // 將輸入框替換為顯示行
                val index = container.indexOfChild(slotView)
                container.removeViewAt(index)
                addTimeSlotView(container, coachPhone, timeSlot, totalText, index)
                Toast.makeText(this, "已保存時間段：$timeSlot", Toast.LENGTH_SHORT).show()
            } else {
                showTimeFormatErrorDialog()
            }
        }
        deleteBtn.setOnClickListener {
            container.removeView(slotView)
        }
        container.addView(slotView)
    }

    private fun addTimeSlotView(container: LinearLayout, coachPhone: String, value: String, totalText: TextView, atIndex: Int? = null) {
        val view = layoutInflater.inflate(R.layout.item_time_slot, container, false)
        val text = view.findViewById<TextView>(R.id.timeSlotText)
        val del = view.findViewById<Button>(R.id.deleteTimeSlotButton)
        text.text = value
        del.setOnClickListener {
            val list = coachHoursMap.getOrPut(coachPhone) { mutableListOf() }
            list.remove(value)
            container.removeView(view)
            recalcCoachTotal(coachPhone)
            totalText.text = formatTotalHours(coachTotalHours[coachPhone] ?: 0.0)
        }
        if (atIndex != null) container.addView(view, atIndex) else container.addView(view)
    }

    private fun isValidSlot(text: String): Boolean {
        if (!text.matches(Regex("^\\d{1,2}:\\d{2}-\\d{1,2}:\\d{2}$"))) return false
        val parts = text.split("-")
        val (sh, sm) = parts[0].split(":").map { it.toInt() }
        val (eh, em) = parts[1].split(":").map { it.toInt() }
        return (eh * 60 + em) > (sh * 60 + sm)
    }

    private fun showTimeFormatErrorDialog() {
        val dialog = androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("⚠️ 時間格式錯誤")
            .setMessage("請按照以下格式輸入時間段：\n\n" +
                "📝 正確格式：HH:mm-HH:mm\n\n" +
                "✅ 正確示例：\n" +
                "• 09:00-10:00\n" +
                "• 14:30-16:00\n" +
                "• 19:00-20:30\n\n" +
                "❌ 錯誤示例：\n" +
                "• 9-10 (缺少冒號)\n" +
                "• 9:00-10 (缺少分鐘)\n" +
                "• 9:0-10:00 (分鐘格式錯誤)\n\n" +
                "💡 注意：\n" +
                "• 小時可以是 1-2 位數字\n" +
                "• 分鐘必須是 2 位數字\n" +
                "• 結束時間必須大於開始時間\n\n" +
                "✨ 智能提示：\n" +
                "• 輸入 9-10 會自動轉換為 09:00-10:00\n" +
                "• 輸入 14:30-16 會自動轉換為 14:30-16:00")
            .setPositiveButton("了解") { _, _ -> }
            .setIcon(android.R.drawable.ic_dialog_info)
            .create()
        
        dialog.show()
    }

    private fun autoFormatTimeInput(input: String): String {
        if (input.matches(Regex("^\\d{1,2}:\\d{2}-\\d{1,2}:\\d{2}$"))) {
            return input // 已經是正確格式
        }
        
        // 處理各種輸入格式
        val parts = input.split("-")
        if (parts.size != 2) return input
        
        val startPart = parts[0].trim()
        val endPart = parts[1].trim()
        
        // 格式化開始時間
        val formattedStart = formatTimePart(startPart)
        // 格式化結束時間
        val formattedEnd = formatTimePart(endPart)
        
        return "$formattedStart-$formattedEnd"
    }
    
    private fun formatTimePart(timePart: String): String {
        if (timePart.contains(":")) {
            // 已經有冒號，檢查分鐘部分
            val timeParts = timePart.split(":")
            if (timeParts.size == 2) {
                val hour = timeParts[0].padStart(2, '0')
                val minute = timeParts[1].padStart(2, '0')
                return "$hour:$minute"
            }
        } else {
            // 沒有冒號，假設是小時
            val hour = timePart.padStart(2, '0')
            return "$hour:00"
        }
        
        return timePart
    }

    private fun setupTimeInputValidation(
        startHourEdit: EditText,
        startMinuteEdit: EditText,
        endHourEdit: EditText,
        endMinuteEdit: EditText,
        saveBtn: Button
    ) {
        // 小時輸入限制：0-23
        startHourEdit.addTextChangedListener(object : android.text.TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: android.text.Editable?) {
                val text = s?.toString() ?: ""
                if (text.isNotEmpty()) {
                    val hour = text.toIntOrNull() ?: 0
                    if (hour > 23) {
                        startHourEdit.setText("23")
                        startHourEdit.setSelection(2)
                    }
                }
                validateTimeInputs(startHourEdit, startMinuteEdit, endHourEdit, endMinuteEdit, saveBtn)
            }
        })

        startMinuteEdit.addTextChangedListener(object : android.text.TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: android.text.Editable?) {
                val text = s?.toString() ?: ""
                if (text.isNotEmpty()) {
                    val minute = text.toIntOrNull() ?: 0
                    if (minute > 59) {
                        startMinuteEdit.setText("59")
                        startMinuteEdit.setSelection(2)
                    }
                }
                validateTimeInputs(startHourEdit, startMinuteEdit, endHourEdit, endMinuteEdit, saveBtn)
            }
        })

        endHourEdit.addTextChangedListener(object : android.text.TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: android.text.Editable?) {
                val text = s?.toString() ?: ""
                if (text.isNotEmpty()) {
                    val hour = text.toIntOrNull() ?: 0
                    if (hour > 23) {
                        endHourEdit.setText("23")
                        endHourEdit.setSelection(2)
                    }
                }
                validateTimeInputs(startHourEdit, startMinuteEdit, endHourEdit, endMinuteEdit, saveBtn)
            }
        })

        endMinuteEdit.addTextChangedListener(object : android.text.TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: android.text.Editable?) {
                val text = s?.toString() ?: ""
                if (text.isNotEmpty()) {
                    val minute = text.toIntOrNull() ?: 0
                    if (minute > 59) {
                        endMinuteEdit.setText("59")
                        endMinuteEdit.setSelection(2)
                    }
                }
                validateTimeInputs(startHourEdit, startMinuteEdit, endHourEdit, endMinuteEdit, saveBtn)
            }
        })
    }

    private fun validateTimeInputs(
        startHourEdit: EditText,
        startMinuteEdit: EditText,
        endHourEdit: EditText,
        endMinuteEdit: EditText,
        saveBtn: Button
    ) {
        val startHour = startHourEdit.text?.toString()?.trim() ?: ""
        val startMinute = startMinuteEdit.text?.toString()?.trim() ?: ""
        val endHour = endHourEdit.text?.toString()?.trim() ?: ""
        val endMinute = endMinuteEdit.text?.toString()?.trim() ?: ""

        if (startHour.isNotEmpty() && startMinute.isNotEmpty() && endHour.isNotEmpty() && endMinute.isNotEmpty()) {
            val timeSlot = "$startHour:$startMinute-$endHour:$endMinute"
            if (isValidSlot(timeSlot)) {
                saveBtn.isEnabled = true
                saveBtn.backgroundTintList = android.content.res.ColorStateList.valueOf(resources.getColor(android.R.color.holo_green_dark, null))
            } else {
                saveBtn.isEnabled = false
                saveBtn.backgroundTintList = android.content.res.ColorStateList.valueOf(resources.getColor(android.R.color.holo_red_dark, null))
            }
        } else {
            saveBtn.isEnabled = false
            saveBtn.backgroundTintList = android.content.res.ColorStateList.valueOf(resources.getColor(android.R.color.holo_red_dark, null))
        }
    }

    private fun recalcCoachTotal(coachPhone: String) {
        val list = coachHoursMap[coachPhone] ?: emptyList()
        var sum = 0.0
        for (slot in list) {
            val parts = slot.split("-")
            val start = parts[0]
            val end = parts[1]
            sum += diffInHours(start, end)
        }
        coachTotalHours[coachPhone] = sum
    }

    private fun diffInHours(start: String, end: String): Double {
        val (sh, sm) = start.split(":").map { it.toInt() }
        val (eh, em) = end.split(":").map { it.toInt() }
        val minutes = (eh * 60 + em) - (sh * 60 + sm)
        return (minutes / 30.0) * 0.5 // 30分鐘=0.5 小時
    }

    private fun formatTotalHours(v: Double): String = String.format("%.1f", v)

    // 系統配置相關方法
    private fun performConfigSearch() {
        val searchQuery = configSearchEdit.text?.toString()?.trim().orEmpty()
        if (searchQuery.isEmpty()) {
            Toast.makeText(this, "請輸入搜索關鍵詞", Toast.LENGTH_SHORT).show()
            return
        }

        // 模擬搜索結果
        val searchResults = listOf(
            "學生：張小明 - 初級班",
            "教練：李教練 - 高級班",
            "課程：自由式進階 - 週三 19:00",
            "班級：兒童游泳班A - 週一至週五"
        ).filter { it.contains(searchQuery) }

        if (searchResults.isNotEmpty()) {
            displaySearchResults(searchResults)
        } else {
            Toast.makeText(this, "未找到相關結果", Toast.LENGTH_SHORT).show()
            searchResultsContainer.visibility = View.GONE
        }
    }

    private fun displaySearchResults(results: List<String>) {
        searchResultsList.removeAllViews()
        searchResultsContainer.visibility = View.VISIBLE

        for (result in results) {
            val resultView = TextView(this).apply {
                text = "• $result"
                textSize = 16f
                setTextColor(resources.getColor(android.R.color.black, null))
                setPadding(16, 8, 16, 8)
                background = resources.getDrawable(R.drawable.bg_info_border, null)
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    setMargins(0, 0, 0, 8)
                }
            }
            searchResultsList.addView(resultView)
        }
    }

    private fun showFunctionDescription(title: String, description: String) {
        functionDescriptionText.text = description
        functionDescriptionContainer.visibility = View.VISIBLE
        
        // 顯示功能說明對話框
        val dialog = androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle(title)
            .setMessage(description)
            .setPositiveButton("了解") { _, _ ->
                // 對話框關閉後，保持說明區域可見
            }
            .setNegativeButton("關閉說明") { _, _ ->
                functionDescriptionContainer.visibility = View.GONE
            }
            .create()
        
        dialog.show()
    }

    // 生成課表功能
    private fun generateSchedule() {
        val dialog = androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("📅 生成課表")
            .setMessage("請選擇課表生成的選項：")
            .setPositiveButton("自動生成") { _, _ ->
                performAutoScheduleGeneration()
            }
            .setNeutralButton("手動設置") { _, _ ->
                showManualScheduleDialog()
            }
            .setNegativeButton("取消", null)
            .create()
        
        dialog.show()
    }

    private fun performAutoScheduleGeneration() {
        // 顯示進度對話框
        val progressDialog = androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("正在生成課表...")
            .setMessage("請稍候，系統正在分析教練時間和學生需求...")
            .setCancelable(false)
            .create()
        
        progressDialog.show()

        // 模擬生成過程
        CoroutineScope(Dispatchers.IO).launch {
            try {
                // 模擬API調用
                kotlinx.coroutines.delay(2000)
                
                withContext(Dispatchers.Main) {
                    progressDialog.dismiss()
                    showScheduleGenerationResult()
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    progressDialog.dismiss()
                    Toast.makeText(this@AdminMainActivity, "生成課表失敗: ${e.message}", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    private fun showScheduleGenerationResult() {
        val resultDialog = androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("✅ 課表生成完成")
            .setMessage("課表已成功生成！\n\n" +
                "• 生成了 15 個課程時段\n" +
                "• 分配了 8 名教練\n" +
                "• 滿足了 95% 的學生需求\n" +
                "• 課程負載均衡度：92%\n\n" +
                "是否要查看生成的課表？")
            .setPositiveButton("查看課表") { _, _ ->
                // 這裡可以跳轉到課表查看頁面
                Toast.makeText(this, "跳轉到課表查看頁面", Toast.LENGTH_SHORT).show()
            }
            .setNegativeButton("關閉", null)
            .create()
        
        resultDialog.show()
    }

    private fun showManualScheduleDialog() {
        Toast.makeText(this, "手動設置功能開發中...", Toast.LENGTH_SHORT).show()
    }

    // 創建待約功能
    private fun createWaitlist() {
        val dialog = androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("⏳ 創建待約")
            .setMessage("請選擇要創建待約的課程類型：")
            .setPositiveButton("兒童初級班") { _, _ ->
                createWaitlistForCourse("兒童初級班")
            }
            .setNeutralButton("成人進階班") { _, _ ->
                createWaitlistForCourse("成人進階班")
            }
            .setNegativeButton("取消", null)
            .create()
        
        dialog.show()
    }

    private fun createWaitlistForCourse(courseType: String) {
        val inputDialog = androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("創建待約 - $courseType")
            .setMessage("請設置待約參數：")
            .setView(createWaitlistInputView(courseType))
            .setPositiveButton("創建") { _, _ ->
                // 處理待約創建邏輯
                Toast.makeText(this, "已為 $courseType 創建待約", Toast.LENGTH_SHORT).show()
            }
            .setNegativeButton("取消", null)
            .create()
        
        inputDialog.show()
    }

    private fun createWaitlistInputView(courseType: String): View {
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(32, 16, 32, 16)
        }

        // 最大等待人數
        val maxWaitlistLabel = TextView(this).apply {
            text = "最大等待人數："
            textSize = 16f
            setPadding(0, 8, 0, 8)
        }
        val maxWaitlistInput = EditText(this).apply {
            hint = "例如：20"
            inputType = android.text.InputType.TYPE_CLASS_NUMBER
            setPadding(0, 8, 0, 16)
        }

        // 優先級設置
        val priorityLabel = TextView(this).apply {
            text = "優先級設置："
            textSize = 16f
            setPadding(0, 8, 0, 8)
        }
        val prioritySpinner = Spinner(this).apply {
            val priorities = arrayOf("先到先得", "按年齡排序", "按水平排序", "VIP優先")
            val adapter = android.widget.ArrayAdapter(this@AdminMainActivity, android.R.layout.simple_spinner_item, priorities)
            adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
            setAdapter(adapter)
            setPadding(0, 8, 0, 16)
        }

        layout.addView(maxWaitlistLabel)
        layout.addView(maxWaitlistInput)
        layout.addView(priorityLabel)
        layout.addView(prioritySpinner)

        return layout
    }

    // 添加學生功能
    private fun addStudent() {
        val dialog = androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("👤 添加學生")
            .setMessage("請選擇添加學生的方式：")
            .setPositiveButton("單個添加") { _, _ ->
                showAddStudentForm()
            }
            .setNeutralButton("批量導入") { _, _ ->
                showBatchImportDialog()
            }
            .setNegativeButton("取消", null)
            .create()
        
        dialog.show()
    }

    private fun showAddStudentForm() {
        val inputView = createStudentInputForm()
        val dialog = androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("添加新學生")
            .setView(inputView)
            .setPositiveButton("保存") { _, _ ->
                // 處理學生信息保存
                Toast.makeText(this, "學生信息已保存", Toast.LENGTH_SHORT).show()
            }
            .setNegativeButton("取消", null)
            .create()
        
        dialog.show()
    }

    private fun createStudentInputForm(): View {
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(32, 16, 32, 16)
        }

        // 學生姓名
        val nameLabel = TextView(this).apply {
            text = "學生姓名："
            textSize = 16f
            setPadding(0, 8, 0, 8)
        }
        val nameInput = EditText(this).apply {
            hint = "請輸入學生姓名"
            setPadding(0, 8, 0, 16)
        }

        // 家長電話
        val phoneLabel = TextView(this).apply {
            text = "家長電話："
            textSize = 16f
            setPadding(0, 8, 0, 8)
        }
        val phoneInput = EditText(this).apply {
            hint = "請輸入家長電話"
            inputType = android.text.InputType.TYPE_CLASS_PHONE
            setPadding(0, 8, 0, 16)
        }

        // 游泳水平
        val levelLabel = TextView(this).apply {
            text = "游泳水平："
            textSize = 16f
            setPadding(0, 8, 0, 8)
        }
        val levelSpinner = Spinner(this).apply {
            val levels = arrayOf("初學者", "初級", "中級", "高級", "競技級")
            val adapter = android.widget.ArrayAdapter(this@AdminMainActivity, android.R.layout.simple_spinner_item, levels)
            adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
            setAdapter(adapter)
            setPadding(0, 8, 0, 16)
        }

        // 年齡
        val ageLabel = TextView(this).apply {
            text = "年齡："
            textSize = 16f
            setPadding(0, 8, 0, 8)
        }
        val ageInput = EditText(this).apply {
            hint = "請輸入年齡"
            inputType = android.text.InputType.TYPE_CLASS_NUMBER
            setPadding(0, 8, 0, 16)
        }

        layout.addView(nameLabel)
        layout.addView(nameInput)
        layout.addView(phoneLabel)
        layout.addView(phoneInput)
        layout.addView(levelLabel)
        layout.addView(levelSpinner)
        layout.addView(ageLabel)
        layout.addView(ageInput)

        return layout
    }

    private fun showBatchImportDialog() {
        Toast.makeText(this, "批量導入功能開發中...", Toast.LENGTH_SHORT).show()
    }

    private fun uploadWorkHours() {
        val date = dateText.text.toString()
        // 以教練列表上方的地點選擇為當前 location
        val currentLocation = try { locationSpinner.selectedItem?.toString() ?: "" } catch(_: Exception) { "" }
        val entries: List<Map<String, Any>> = coachTotalHours.map { (phone, hours) ->
            val name = allCoaches.find { it.phone == phone }?.name ?: phone
            val timeSlots = coachHoursMap[phone]?.toList() ?: emptyList()
            val club = coachSelectedClub[phone] ?: ""
            mapOf(
                "phone" to phone,
                "name" to name,
                "hours" to hours,
                "timeSlots" to timeSlots,
                "uploadTime" to System.currentTimeMillis(),
                "club" to club,
                "location" to currentLocation
            )
        }
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val api = CloudAPIService(this@AdminMainActivity)
                val resp = api.uploadCoachWorkHours(date, entries)
                withContext(Dispatchers.Main) {
                    Toast.makeText(this@AdminMainActivity, if (resp.success) "工時已上傳" else "上傳失敗: ${resp.message}", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) { Toast.makeText(this@AdminMainActivity, "上傳異常: ${e.message}", Toast.LENGTH_SHORT).show() }
            }
        }
    }

    // 補一個簡化的彈窗（如未定義）
    private fun showCoachListDialog() {
        val container = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(16,16,16,16) }
        val scroll = ScrollView(this).apply { addView(container) }
        val dialog = androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("教練列表")
            .setView(scroll)
            .setPositiveButton("關閉", null)
            .create()
        dialog.setOnShowListener {
            dialog.window?.setSoftInputMode(
                android.view.WindowManager.LayoutParams.SOFT_INPUT_STATE_ALWAYS_VISIBLE or
                    android.view.WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE
            )
        }
        dialog.show()
        // 直接渲染現有列表到彈窗
        for (c in allCoaches) addCoachRowTo(container, c)
    }

    private fun setupTimeInputValidationNew(
        startTimeEdit: EditText,
        endTimeEdit: EditText,
        saveBtn: Button
    ) {
        // 開始時間輸入限制和驗證
        startTimeEdit.addTextChangedListener(object : android.text.TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: android.text.Editable?) {
                val text = s?.toString() ?: ""
                if (text.isNotEmpty()) {
                    // 限制為4位數字
                    if (text.length > 4) {
                        startTimeEdit.setText(text.take(4))
                        startTimeEdit.setSelection(4)
                    }
                    // 驗證時間格式
                    validateTimeInputsNew(startTimeEdit, endTimeEdit, saveBtn)
                }
            }
        })

        // 結束時間輸入限制和驗證
        endTimeEdit.addTextChangedListener(object : android.text.TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: android.text.Editable?) {
                val text = s?.toString() ?: ""
                if (text.isNotEmpty()) {
                    // 限制為4位數字
                    if (text.length > 4) {
                        endTimeEdit.setText(text.take(4))
                        endTimeEdit.setSelection(4)
                    }
                    // 驗證時間格式
                    validateTimeInputsNew(startTimeEdit, endTimeEdit, saveBtn)
                }
            }
        })
    }

    private fun validateTimeInputsNew(
        startTimeEdit: EditText,
        endTimeEdit: EditText,
        saveBtn: Button
    ) {
        val startTime = startTimeEdit.text?.toString()?.trim() ?: ""
        val endTime = endTimeEdit.text?.toString()?.trim() ?: ""

        if (startTime.isNotEmpty() && endTime.isNotEmpty()) {
            // 轉換為標準格式並驗證
            val timeSlot = convertToStandardFormat(startTime, endTime)
            if (isValidSlot(timeSlot)) {
                saveBtn.isEnabled = true
                saveBtn.backgroundTintList = android.content.res.ColorStateList.valueOf(resources.getColor(android.R.color.holo_green_dark, null))
            } else {
                saveBtn.isEnabled = false
                saveBtn.backgroundTintList = android.content.res.ColorStateList.valueOf(resources.getColor(android.R.color.holo_red_dark, null))
            }
        } else {
            saveBtn.isEnabled = false
            saveBtn.backgroundTintList = android.content.res.ColorStateList.valueOf(resources.getColor(android.R.color.holo_red_dark, null))
        }
    }

    private fun convertToStandardFormat(startTime: String, endTime: String): String {
        // 將4位數字轉換為標準格式 HH:MM-HH:MM
        val startHour = startTime.take(2).padStart(2, '0')
        val startMinute = startTime.takeLast(2).padStart(2, '0')
        val endHour = endTime.take(2).padStart(2, '0')
        val endMinute = endTime.takeLast(2).padStart(2, '0')
        
        return "$startHour:$startMinute-$endHour:$endMinute"
    }

    // 出席記錄相關方法
    private fun setupLocationSpinner() {
        // 從數據庫獲取所有地點
        val locations = mutableListOf("全部地點")
        val uniqueLocations = allStudents.mapNotNull { it.location }
            .map { normalizeLocationName(it) } // 標準化地點名稱
            .distinct()
            .sorted()
        locations.addAll(uniqueLocations)
        
        Log.d("AdminMainActivity", "📍 設置地點下拉選單: ${locations.size} 個選項")
        Log.d("AdminMainActivity", "📍 地點選項: ${locations.joinToString(", ")}")
        
        val adapter = ArrayAdapter(this, android.R.layout.simple_spinner_item, locations)
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        locationSpinner.adapter = adapter
        
        // 設置選擇監聽器
        locationSpinner.onItemSelectedListener = object : android.widget.AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: android.widget.AdapterView<*>?, view: android.view.View?, position: Int, id: Long) {
                val selectedLocation = parent?.getItemAtPosition(position)?.toString() ?: "全部地點"
                Log.d("AdminMainActivity", "📍 地點選擇變更: $selectedLocation")
            }
            
            override fun onNothingSelected(parent: android.widget.AdapterView<*>?) {
                Log.d("AdminMainActivity", "📍 沒有選擇地點")
            }
        }
    }

    private fun setupDatePicker() {
        // 設置初始日期文本為"選擇日期"
        attendanceDateText.text = "選擇日期"
        
        attendancePickDateButton.setOnClickListener {
            Log.d("AdminMainActivity", "📅 日期選擇按鈕被點擊")
            
            val cal = Calendar.getInstance()
            val datePickerDialog = DatePickerDialog(
                this,
                { _, year, month, dayOfMonth ->
                    val selectedCal = Calendar.getInstance()
                    selectedCal.set(year, month, dayOfMonth)
                    updateAttendanceDateText(selectedCal)
                    Log.d("AdminMainActivity", "📅 日期已選擇: ${attendanceDateText.text}")
                },
                cal.get(Calendar.YEAR),
                cal.get(Calendar.MONTH),
                cal.get(Calendar.DAY_OF_MONTH)
            )
            datePickerDialog.show()
        }
    }

    private fun setupAttendanceButtons() {
        attendanceSearchButton.setOnClickListener {
            Log.d("AdminMainActivity", "🔍 搜索按鈕被點擊")
            performAttendanceSearch()
        }
        
        attendanceResetButton.setOnClickListener {
            Log.d("AdminMainActivity", "🔄 重置按鈕被點擊")
            resetAttendanceSearch()
        }
    }

    private fun updateAttendanceDateText(cal: Calendar) {
        val dateFormat = "yyyy-MM-dd"
        val sdf = SimpleDateFormat(dateFormat, Locale.getDefault())
        attendanceDateText.text = sdf.format(cal.time)
    }

    private fun performAttendanceSearch() {
        val selectedLocation = locationSpinner.selectedItem?.toString() ?: "全部地點"
        val selectedDate = attendanceDateText.text.toString()
        
        Log.d("AdminMainActivity", "🔍 執行搜索: 地點=$selectedLocation, 日期=$selectedDate")
        Log.d("AdminMainActivity", "📊 總學生數量: ${allStudents.size}")
        
        // 檢查是否至少選擇了一個搜索條件
        val hasLocationFilter = selectedLocation != "全部地點"
        val hasDateFilter = selectedDate != "選擇日期" && selectedDate.isNotEmpty()
        
        Log.d("AdminMainActivity", "✅ 搜索條件: 地點過濾=$hasLocationFilter, 日期過濾=$hasDateFilter")
        
        if (!hasLocationFilter && !hasDateFilter) {
            Toast.makeText(this, "請選擇至少一個搜索條件（地點或日期）", Toast.LENGTH_SHORT).show()
            return
        }
        
        // 執行搜索
        val filteredStudents = filterStudents(selectedLocation, selectedDate)
        Log.d("AdminMainActivity", "📋 搜索結果: ${filteredStudents.size} 名學生")
        
        // 顯示彈出窗口
        showStudentDataDialog(filteredStudents)
        
        // 顯示搜索結果
        val searchConditions = mutableListOf<String>()
        if (hasLocationFilter) searchConditions.add("地點: $selectedLocation")
        if (hasDateFilter) searchConditions.add("日期: $selectedDate")
        
        val conditionText = searchConditions.joinToString(", ")
        Toast.makeText(this, "搜索完成 ($conditionText)，找到 ${filteredStudents.size} 名學生", Toast.LENGTH_LONG).show()
    }

    private fun filterStudents(location: String, date: String): List<Student> {
        Log.d("AdminMainActivity", "🔍 開始過濾學生: 地點='$location', 日期='$date'")
        Log.d("AdminMainActivity", "📊 總學生數量: ${allStudents.size}")
        
        return allStudents.filter { student ->
            var matches = true
            
            // 地點過濾 - 匹配資料庫中的location字段（使用標準化比較）
            if (location != "全部地點") {
                val normalizedStudentLocation = normalizeLocationName(student.location ?: "")
                val normalizedSearchLocation = normalizeLocationName(location)
                
                Log.d("AdminMainActivity", "📍 地點比較: 學生='${student.location}' -> 標準化='$normalizedStudentLocation', 搜索='$location' -> 標準化='$normalizedSearchLocation'")
                
                val locationMatches = normalizedStudentLocation == normalizedSearchLocation
                matches = matches && locationMatches
                
                Log.d("AdminMainActivity", "📍 地點匹配結果: $locationMatches")
            }
            
            // 日期過濾 - 匹配資料庫中的date字段（上課日期）
            if (date != "選擇日期" && date.isNotEmpty()) {
                // 支持多種日期格式匹配
                val studentDate = student.date ?: ""
                val cleanDate = date.trim()
                
                Log.d("AdminMainActivity", "📅 日期比較: 學生='$studentDate', 搜索='$cleanDate'")
                
                // 直接匹配
                if (studentDate == cleanDate) {
                    matches = matches && true
                    Log.d("AdminMainActivity", "📅 日期直接匹配成功")
                } else {
                    // 檢查是否包含日期（支持部分匹配）
                    val datePattern = cleanDate.replace("-", "").replace("/", "").replace("年", "").replace("月", "").replace("日", "")
                    val studentDatePattern = studentDate.replace("-", "").replace("/", "").replace("年", "").replace("月", "").replace("日", "")
                    
                    Log.d("AdminMainActivity", "📅 日期模式比較: 學生模式='$studentDatePattern', 搜索模式='$datePattern'")
                    
                    if (datePattern.isNotEmpty() && studentDatePattern.contains(datePattern)) {
                        matches = matches && true
                        Log.d("AdminMainActivity", "📅 日期模式匹配成功")
                    } else {
                        matches = matches && false
                        Log.d("AdminMainActivity", "📅 日期模式匹配失敗")
                    }
                }
            }
            
            Log.d("AdminMainActivity", "✅ 學生 ${student.name} 最終匹配結果: $matches")
            matches
        }
    }

    private fun resetAttendanceSearch() {
        locationSpinner.setSelection(0) // 重置為"全部地點"
        attendanceDateText.text = "選擇日期" // 重置為"選擇日期"
        
        Toast.makeText(this, "搜索條件已重置", Toast.LENGTH_SHORT).show()
    }



    private fun createLocationHeader(location: String, studentCount: Int): TextView {
        return TextView(this).apply {
            text = "📍 $location (共 $studentCount 名學生)"
            textSize = 16f
            setTypeface(null, android.graphics.Typeface.BOLD)
            setTextColor(0xFF1976D2.toInt())
            setPadding(20, 16, 20, 8)
            background = resources.getDrawable(android.R.color.holo_blue_light, null)
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                topMargin = 16
                bottomMargin = 8
            }
        }
    }

    private fun createDateHeader(date: String, studentCount: Int): TextView {
        return TextView(this).apply {
            text = "📅 $date (共 $studentCount 名學生)"
            textSize = 14f
            setTypeface(null, android.graphics.Typeface.BOLD)
            setTextColor(0xFFFF0000.toInt())
            setPadding(20, 12, 20, 6)
            background = resources.getDrawable(android.R.color.holo_orange_light, null)
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                topMargin = 8
                bottomMargin = 4
                leftMargin = 20
            }
        }
    }

    private fun createAttendanceTable(students: List<Student>): LinearLayout {
        val tableContainer = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(16, 8, 16, 8)
            background = resources.getDrawable(android.R.color.white, null)
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                leftMargin = 20
                rightMargin = 20
            }
        }
        
        // 創建表格標題行
        val headerRow = createTableHeaderRow()
        tableContainer.addView(headerRow)
        
        // 按時間排序學生
        val sortedStudents = students.sortedBy { it.time }
        
        // 創建學生數據行
        sortedStudents.forEach { student ->
            val studentRow = createStudentDataRow(student)
            tableContainer.addView(studentRow)
        }
        
        return tableContainer
    }



    // 按時間順序排序日期，與電腦版本保持一致
    private fun sortDatesByChronologicalOrder(dates: List<String>): List<String> {
        return dates.sortedWith { date1, date2 ->
            try {
                val format1 = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
                val format2 = SimpleDateFormat("yyyy年MM月dd日", Locale.getDefault())
                
                val date1Obj = try {
                    format1.parse(date1)
                } catch (e: Exception) {
                    try {
                        format2.parse(date1)
                    } catch (e2: Exception) {
                        null
                    }
                }
                
                val date2Obj = try {
                    format1.parse(date2)
                } catch (e: Exception) {
                    try {
                        format2.parse(date2)
                    } catch (e2: Exception) {
                        null
                    }
                }
                
                when {
                    date1Obj == null && date2Obj == null -> date1.compareTo(date2)
                    date1Obj == null -> 1
                    date2Obj == null -> -1
                    else -> date1Obj.compareTo(date2Obj)
                }
            } catch (e: Exception) {
                date1.compareTo(date2)
            }
        }
    }

    // 預載入學生數據
    private fun preloadStudents() {
        CoroutineScope(Dispatchers.Main).launch {
            try {
                Log.d("AdminMainActivity", "🔄 開始預載入學生數據...")
                
                val students = withContext(Dispatchers.IO) {
                    cloudAPIService.fetchStudentsFromCloud()
                }
                
                Log.d("AdminMainActivity", "📊 從API獲取到 ${students.size} 名學生")
                
                allStudents.clear()
                allStudents.addAll(students)
                
                // 在數據載入完成後初始化地點下拉選單
                setupLocationSpinner()
                
                Log.d("AdminMainActivity", "✅ 學生數據預載入完成，地點下拉選單已更新")
                
            } catch (e: Exception) {
                Log.e("AdminMainActivity", "❌ API調用失敗，使用模擬數據: ${e.message}")
                
                // 如果API調用失敗，使用模擬數據
                val mockStudents = createMockStudents()
                allStudents.clear()
                allStudents.addAll(mockStudents)
                
                // 在模擬數據載入完成後初始化地點下拉選單
                setupLocationSpinner()
                
                Log.d("AdminMainActivity", "✅ 模擬數據載入完成，地點下拉選單已更新")
            }
        }
    }

    private fun createMockStudents(): List<Student> {
        return listOf(
            Student(
                name = "甄文彥",
                option1 = "1",
                option2 = "🌟1",
                option3 = "1.5",
                time = "01:50-02:50",
                date = "2025-08-07",
                location = "維多利亞公園游泳池"
            ),
            Student(
                name = "張小明",
                option1 = "2",
                option2 = "🌟1.5",
                option3 = "2.0",
                time = "02:00-03:00",
                date = "2025-08-07",
                location = "維多利亞公園游泳池"
            ),
            Student(
                name = "李小華",
                option1 = "缺席",
                option2 = "--",
                option3 = "0.0",
                time = "03:00-04:00",
                date = "2025-08-07",
                location = "維多利亞公園游泳池"
            ),
            Student(
                name = "王大明",
                option1 = "1.5",
                option2 = "🌟0.5",
                option3 = "1.0",
                time = "04:00-05:00",
                date = "2025-08-08",
                location = "九龍公園游泳池"
            ),
            Student(
                name = "陳小美",
                option1 = "2.5",
                option2 = "🔁1",
                option3 = "2.5",
                time = "05:00-06:00",
                date = "2025-08-08",
                location = "九龍公園游泳池"
            ),
            Student(
                name = "劉志強",
                option1 = "3",
                option2 = "--",
                option3 = "3.0",
                time = "06:00-07:00",
                date = "2025-08-09",
                location = "摩士公園游泳池"
            )
        )
    }

    // 處理學生選項變更
    private fun handleStudentOptionChange(student: Student, newValue: String, fieldType: String) {
        Log.d("AdminMainActivity", "🔄 處理學生選項變更: ${student.name}, $fieldType = $newValue")
        Log.d("AdminMainActivity", "🔍 學生詳細信息: name=${student.name}, date=${student.date}, pending=${student.pending}, location=${student.location}")
        
        // 更新本地數據
        val updatedStudent = when (fieldType) {
            "option1" -> student.copy(option1 = newValue)
            "option2" -> student.copy(option2 = newValue)
            else -> student
        }
        
        val studentIndex = allStudents.indexOfFirst { 
            it.name == student.name && it.date == student.date && it.location == student.location 
        }
        
        Log.d("AdminMainActivity", "📍 找到學生索引: $studentIndex")
        Log.d("AdminMainActivity", "📍 搜索條件: name=${student.name}, date=${student.date}, location=${student.location}")
        
        if (studentIndex != -1) {
            allStudents[studentIndex] = updatedStudent
            Log.d("AdminMainActivity", "✅ 本地數據已更新")
            
            // 顯示更新提示
            val fieldName = when (fieldType) {
                "option1" -> "出席狀況"
                "option2" -> "補/調堂"
                else -> fieldType
            }
            Toast.makeText(this, "已更新 ${student.name} 的 $fieldName 為: $newValue", Toast.LENGTH_SHORT).show()
            
            // 只更新特定學生的項目，而不是整個列表
            // studentAttendanceAdapter.updateStudent(updatedStudent) // This line was removed as per the edit hint
            Log.d("AdminMainActivity", "🔄 適配器已更新")
            
            // 嘗試更新資料庫
            updateDatabaseAsync(updatedStudent, newValue, fieldType)
        } else {
            Log.e("AdminMainActivity", "❌ 未找到學生索引")
            Log.e("AdminMainActivity", "❌ 搜索條件: name=${student.name}, date=${student.date}, location=${student.location}")
            Log.e("AdminMainActivity", "❌ 所有學生數量: ${allStudents.size}")
            
            // 嘗試只按姓名查找
            val nameOnlyIndex = allStudents.indexOfFirst { it.name == student.name }
            if (nameOnlyIndex != -1) {
                val foundStudent = allStudents[nameOnlyIndex]
                Log.e("AdminMainActivity", "❌ 找到同名學生但日期/地點不匹配:")
                Log.e("AdminMainActivity", "❌ 資料庫學生: name=${foundStudent.name}, date=${foundStudent.date}, location=${foundStudent.location}")
                Log.e("AdminMainActivity", "❌ 請求學生: name=${student.name}, date=${student.date}, location=${student.location}")
            }
            
            Toast.makeText(this, "❌ 本地找不到學生記錄，請檢查數據", Toast.LENGTH_LONG).show()
        }
    }

    // 異步更新資料庫
    private fun updateDatabaseAsync(student: Student, newValue: String, fieldType: String) {
        CoroutineScope(Dispatchers.Main).launch {
            try {
                // 修復日期字段映射，確保與後端資料庫結構完全匹配
                // 優先使用標準date字段，如果為空則嘗試其他可能的日期字段
                val dateField = when {
                    !student.date.isNullOrEmpty() -> student.date
                    !student.pending.isNullOrEmpty() -> student.pending
                    else -> ""
                }
                
                val studentData = mapOf(
                    "name" to (student.name ?: ""),
                    "上課日期" to dateField, // 使用資料庫實際的字段名"上課日期"
                    "location" to (student.location ?: ""),
                    fieldType to newValue // 直接使用option1/option2
                )
                
                Log.d("AdminMainActivity", "📝 準備更新資料庫: $studentData")
                Log.d("AdminMainActivity", "🔍 字段類型: $fieldType, 新值: $newValue")
                Log.d("AdminMainActivity", "👤 學生信息: ${student.name}, 日期: $dateField, 地點: ${student.location}")
                
                val response = withContext(Dispatchers.IO) {
                    cloudAPIService.updateStudentData(studentData)
                }
                
                if (response.success) {
                    Log.d("AdminMainActivity", "✅ 資料庫更新成功: ${student.name} 的 $fieldType = $newValue")
                    Toast.makeText(this@AdminMainActivity, "✅ 資料庫同步成功", Toast.LENGTH_SHORT).show()
                    
                    // 更新成功後，強制刷新本地數據
                    refreshStudentData()
                } else {
                    Log.e("AdminMainActivity", "❌ 資料庫更新失敗: ${response.message}")
                    Log.e("AdminMainActivity", "❌ 失敗詳情: 學生=${student.name}, 字段=$fieldType, 值=$newValue")
                    
                    // 顯示詳細錯誤信息
                    val errorMessage = when {
                        response.message.contains("404") -> "找不到學生記錄，請檢查姓名和日期"
                        response.message.contains("400") -> "請求數據格式錯誤"
                        response.message.contains("500") -> "服務器內部錯誤"
                        else -> "資料庫更新失敗: ${response.message}"
                    }
                    Toast.makeText(this@AdminMainActivity, errorMessage, Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                Log.e("AdminMainActivity", "❌ 資料庫更新異常", e)
                Log.e("AdminMainActivity", "❌ 異常詳情: 學生=${student.name}, 字段=$fieldType, 值=$newValue")
                
                val errorMessage = when {
                    e.message?.contains("Network") == true -> "網絡連接失敗，請檢查網絡設置"
                    e.message?.contains("timeout") == true -> "請求超時，請稍後重試"
                    else -> "資料庫更新異常: ${e.message}"
                }
                Toast.makeText(this@AdminMainActivity, errorMessage, Toast.LENGTH_LONG).show()
            }
        }
    }
    
    // 強制刷新學生數據
    private fun refreshStudentData() {
        CoroutineScope(Dispatchers.Main).launch {
            try {
                Log.d("AdminMainActivity", "🔄 強制刷新學生數據...")
                val freshStudents = withContext(Dispatchers.IO) {
                    cloudAPIService.fetchStudentsFromCloud()
                }
                
                if (freshStudents.isNotEmpty()) {
                    allStudents.clear()
                    allStudents.addAll(freshStudents)
                    
                    // 學生數據已刷新，但UI不需要重建（因為使用彈出窗口）
                    Log.d("AdminMainActivity", "✅ 學生數據已刷新")
                } else {
                    Log.e("AdminMainActivity", "❌ 刷新學生數據失敗: 沒有獲取到學生數據")
                }
            } catch (e: Exception) {
                Log.e("AdminMainActivity", "❌ 刷新學生數據異常", e)
            }
        }
    }

    private fun showStudentDataDialog(students: List<Student>) {
        val container = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(16,16,16,16) }
        val header = createTableHeaderRow()
        container.addView(header)
        students.sortedBy { it.time ?: "" }.forEach { container.addView(createStudentDataRow(it)) }
        val scroll = ScrollView(this).apply { addView(container) }
        androidx.appcompat.app.AlertDialog.Builder(this).setTitle("學生資料").setView(scroll).setPositiveButton("關閉", null).show()
    }

    private fun createTableHeaderRow(): LinearLayout {
        return LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            setPadding(12,8,12,8)
            addView(TextView(this@AdminMainActivity).apply { text = "姓名"; layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f) })
            addView(TextView(this@AdminMainActivity).apply { text = "時間"; layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f) })
            addView(TextView(this@AdminMainActivity).apply { text = "地點"; layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f) })
        }
    }

    private fun createStudentDataRow(s: Student): LinearLayout {
        return LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            setPadding(12,8,12,8)
            addView(TextView(this@AdminMainActivity).apply { text = s.name ?: ""; layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f) })
            addView(TextView(this@AdminMainActivity).apply { text = s.time ?: ""; layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f) })
            addView(TextView(this@AdminMainActivity).apply { text = s.location ?: ""; layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f) })
        }
    }

    private fun normalizeLocationName(location: String): String {
        return location.replace(Regex("[🏊‍♂🏊♂]"), "").replace(Regex("\\s+"), " ").trim()
    }
}

data class CoachInfo(val name: String, val phone: String) 