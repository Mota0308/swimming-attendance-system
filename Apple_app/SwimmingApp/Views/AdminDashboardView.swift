import SwiftUI

struct AdminDashboardView: View {
    @EnvironmentObject var appState: AppState
    @State private var students: [APIClient.Student] = []
    @State private var locations: [String] = []
    @State private var clubs: [String] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    
    var body: some View {
        NavigationView {
            List {
                if let err = errorMessage { Text(err).foregroundColor(.red) }
                Section(header: Text("學生資料（前100）")) {
                    ForEach(students.prefix(100)) { s in
                        VStack(alignment: .leading) {
                            Text(s.name).font(.headline)
                            Text("電話: \(s.phone)")
                        }
                    }
                }
                Section(header: Text("地點與泳會")) {
                    Text("地點: \(locations.joined(separator: ", "))").lineLimit(3)
                    Text("泳會: \(clubs.joined(separator: ", "))").lineLimit(3)
                }
                Section(header: Text("教練工時（快捷入口）")) {
                    NavigationLink("查看教練儀表板") { CoachDashboardView() }
                }
            }
            .navigationTitle("管理員首頁")
            .onAppear { fetch() }
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("刷新", action: fetch)
                        .disabled(isLoading)
                }
            }
        }
    }
    
    private func fetch() {
        isLoading = true
        errorMessage = nil
        Task { @MainActor in
            do {
                async let a = APIClient.shared.fetchAllStudents()
                async let b = APIClient.shared.fetchLocations()
                let (S, L) = try await (a, b)
                self.students = S
                self.locations = L
                if let first = L.first { self.clubs = try await APIClient.shared.fetchClubs(location: first) }
            } catch { errorMessage = error.localizedDescription }
            isLoading = false
        }
    }
} 