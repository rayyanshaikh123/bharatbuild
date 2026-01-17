import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/app_state.dart';
import '../widgets/offline_banner.dart';

class HomeScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppState>(context);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Home'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () {
              Provider.of<AuthProvider>(context, listen: false).logout();
            },
          ),
        ],
      ),
      body: Column(
        children: [
          OfflineBanner(
            isOffline: appState.isOffline,
            syncStatus: appState.syncStatus,
            toggleOffline: () => appState.toggleOffline(),
          ),
          const Expanded(
            child: Center(child: Text('Welcome! You are logged in.')),
          ),
        ],
      ),
    );
  }
}
