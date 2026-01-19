import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/app_state.dart';
import '../../widgets/offline_banner.dart';
import '../../layouts/app_layout.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppState>(context);
    return AppLayout(
      title: 'Home',
      child: Column(
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
