import SwiftUI

struct RosterEditorView: View {
    @EnvironmentObject var appState: AppState
    let initialMonth: Date
    
    @State private var selectedDate: Date
    @State private var locations: [String] = []
    @State private var dayToTime: [Int: String] = [:]
    @State private var dayToLocation: [Int: String] = [:]
    @State private var isSaving = false
    @State private var errorMessage: String?
    
    init(month: Date) {
        self.initialMonth = month
        _selectedDate = State(initialValue: month)
    }
    
    var body: some View {
        Form {
            Section(header: Text("月份")) {
                DatePicker("選擇月份", selection: $selectedDate, displayedComponents: .date)
                    .datePickerStyle(.compact)
                    .labelsHidden()
            }
            if let err = errorMessage { Text(err).foregroundColor(.red) }
            Section(header: Text("編輯更表（時間與地點）")) {
                ForEach(1..<(daysInMonth + 1), id: \.self) { day in
                    HStack {
                        Text(String(format: "%02d", day)).frame(width: 28)
                        TextField("hh:mm-hh:mm", text: Binding(
                            get: { dayToTime[day] ?? "" },
                            set: { dayToTime[day] = $0 }
                        ))
                        .textInputAutocapitalization(.never)
                        .disableAutocorrection(true)
                        Divider().frame(height: 20)
                        Menu {
                            Picker("地點", selection: Binding(
                                get: { dayToLocation[day] ?? "" },
                                set: { dayToLocation[day] = $0 }
                            )) {
                                Text("選擇地點").tag("")
                                ForEach(locations, id: \.self) { Text($0).tag($0) }
                            }
                        } label: {
                            Text((dayToLocation[day] ?? "").isEmpty ? "地點" : (dayToLocation[day] ?? ""))
                        }
                    }
                }
            }
            Button(action: save) {
                if isSaving { ProgressView() } else { Text("保存更表") }
            }
            .disabled(isSaving)
        }
        .navigationTitle("編輯更表")
        .onAppear { Task { await loadLocations() } }
    }
    
    private var daysInMonth: Int {
        let cal = Calendar.current
        let range = cal.range(of: .day, in: .month, for: selectedDate)!
        return range.count
    }
    
    private func loadLocations() async {
        do { locations = try await APIClient.shared.fetchLocations() } catch { errorMessage = error.localizedDescription }
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
                var entries: [[String: Any]] = []
                for day in 1..<(daysInMonth + 1) {
                    let time = (dayToTime[day] ?? "").trimmingCharacters(in: .whitespaces)
                    let location = (dayToLocation[day] ?? "").trimmingCharacters(in: .whitespaces)
                    if !time.isEmpty || !location.isEmpty {
                        let dateStr = String(format: "%04d-%02d-%02d", year, month, day)
                        entries.append(["date": dateStr, "time": time, "location": location])
                    }
                }
                let req = try await RosterAPI.save(phone: appState.userPhone, name: appState.userName, entries: entries)
                if !req { throw APIError(message: "保存失敗") }
            } catch {
                errorMessage = error.localizedDescription
            }
            isSaving = false
        }
    }
}

enum RosterAPI {
    static func save(phone: String, name: String, entries: [[String: Any]]) async throws -> Bool {
        // 重用 APIClient 的 POST
        let client = APIClient.shared
        let mirror = Mirror(reflecting: client)
        guard let baseURL = mirror.descendant("baseURL") as? URL,
              let publicKey = mirror.descendant("publicKey") as? String,
              let privateKey = mirror.descendant("privateKey") as? String else {
            throw APIError(message: "配置讀取失敗")
        }
        var req = URLRequest(url: baseURL.appendingPathComponent("/coach-roster/batch"))
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        req.setValue(publicKey, forHTTPHeaderField: "X-API-Public-Key")
        req.setValue(privateKey, forHTTPHeaderField: "X-API-Private-Key")
        let body: [String: Any] = ["phone": phone, "name": name, "entries": entries]
        req.httpBody = try JSONSerialization.data(withJSONObject: body, options: [])
        let (_, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse, http.statusCode == 200 else { return false }
        return true
    }
} 