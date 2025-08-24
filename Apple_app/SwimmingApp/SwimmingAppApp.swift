import SwiftUI

@main
struct SwimmingAppApp: App {
    @StateObject private var appState = AppState()
    
    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(appState)
        }
    }
}

final class AppState: ObservableObject {
    @Published var isLoggedIn: Bool = false
    @Published var userPhone: String = ""
    @Published var userName: String = ""
    @Published var userType: String = "coach" // coach | parent | admin
} 