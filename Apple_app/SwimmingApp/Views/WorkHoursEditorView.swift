import SwiftUI

struct WorkHoursEditorView: View {
    @EnvironmentObject var appState: AppState
    let initialDate: Date
    
    @State private var selectedDate: Date
    @State private var selectedLocation: String = ""
    @State private var selectedClub: String = ""
    @State private var locations: [String] = []
    @State private var clubs: [String] = []
    @State private var dayToHours: [Int: String] = [:]
    @State private var dayToSlots: [Int: String] = [:]
    @State private var isSaving = false
    @State private var errorMessage: String?
    
    init(month: Date) {
        self.initialDate = month
        _selectedDate = State(initialValue: month)
    }
    
    var body: some View {
        Form {
            Section(header: Text("月份與篩選")) {
                DatePicker("選擇月份", selection: $selectedDate, displayedComponents: .date)
                    .datePickerStyle(.compact)
                    .labelsHidden()
                Menu {
                    Picker("地點", selection: $selectedLocation) {
                        Text("選擇地點").tag("")
                        ForEach(locations, id: \.self) { Text($0).tag($0) }
                    }
                } label: { Text(selectedLocation.isEmpty ? "地點" : selectedLocation) }
                Menu {
                    Picker("泳會", selection: $selectedClub) {
                        Text("選擇泳會").tag("")
                        ForEach(clubs, id: \.self) { Text($0).tag($0) }
                    }
                } label: { Text(selectedClub.isEmpty ? "泳會" : selectedClub) }
            }
            if let err = errorMessage { Text(err).foregroundColor(.red) }
            Section(header: Text("編輯每日工時與時段（逗號分隔）")) {
                ForEach(1..<(daysInMonth + 1), id: \.self) { day in
                    VStack(alignment: .leading) {
                        HStack {
                            Text(String(format: "%02d", day)).frame(width: 28)
                            TextField("小時數 (例如 1.5)", text: Binding(
                                get: { dayToHours[day] ?? "" },
                                set: { dayToHours[day] = $0 }
                            ))
                            .keyboardType(.decimalPad)
                        }
                        TextField("時段（例如 10:00-11:00, 14:00-15:00）", text: Binding(
                            get: { dayToSlots[day] ?? "" },
                            set: { dayToSlots[day] = $0 }
                        ))
                    }
                }
            }
            Button(action: save) { if isSaving { ProgressView() } else { Text("保存工時") } }
                .disabled(isSaving || selectedLocation.isEmpty || selectedClub.isEmpty)
        }
        .navigationTitle("編輯工時")
        .onAppear { Task { await setup() } }
    }
    
    private var daysInMonth: Int {
        let cal = Calendar.current
        let range = cal.range(of: .day, in: .month, for: selectedDate)!
        return range.count
    }
    
    private func setup() async {
        do { locations = try await APIClient.shared.fetchLocations() } catch { errorMessage = error.localizedDescription }
        if !selectedLocation.isEmpty {
            do { clubs = try await APIClient.shared.fetchClubs(location: selectedLocation) } catch { errorMessage = error.localizedDescription }
        }
    }
    
    private func save() {
        guard !isSaving else { return }
        isSaving = true
        errorMessage = nil
        Task { @MainActor in
            do {
                let cal = Calendar.current
                let year = cal.component(.year, from: selectedDate)
                let month = cal.component(.month, from: selectedDate)
                for day in 1..<(daysInMonth + 1) {
                    let hoursStr = (dayToHours[day] ?? "").trimmingCharacters(in: .whitespaces)
                    let slotsStr = (dayToSlots[day] ?? "").trimmingCharacters(in: .whitespaces)
                    if hoursStr.isEmpty && slotsStr.isEmpty { continue }
                    let hours = Double(hoursStr) ?? 0
                    let date = String(format: "%04d-%02d-%02d", year, month, day)
                    let slots = slotsStr.isEmpty ? [] : slotsStr.split(separator: ',').map { $0.trimmingCharacters(in: .whitespaces) }
                    let entry = APIClient.WorkHourEntry(phone: appState.userPhone, name: appState.userName, hours: hours, timeSlots: slots, location: selectedLocation, club: selectedClub)
                    try await APIClient.shared.uploadCoachWorkHours(date: date, entries: [entry], location: selectedLocation, club: selectedClub)
                }
            } catch { errorMessage = error.localizedDescription }
            isSaving = false
        }
    }
} 