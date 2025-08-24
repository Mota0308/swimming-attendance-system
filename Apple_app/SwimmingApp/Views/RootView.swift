import SwiftUI

struct RootView: View {
    @EnvironmentObject var appState: AppState
    
    var body: some View {
        Group {
            if appState.isLoggedIn {
                switch appState.userType {
                case "parent": ParentDashboardView()
                case "admin": AdminDashboardView()
                default: CoachDashboardView()
                }
            } else {
                LoginView()
            }
        }
    }
} 