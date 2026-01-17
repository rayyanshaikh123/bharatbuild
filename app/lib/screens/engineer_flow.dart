import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../widgets/app_ui.dart';
import '../widgets/offline_banner.dart';
import '../providers/app_state.dart';

class EngineerFlowScreen extends StatelessWidget {
  static const routeName = '/engineer-flow';
  const EngineerFlowScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final items = List.generate(6, (i) => 'Task #${i + 1}');
    final statuses = [
      'ACTIVE',
      'PENDING',
      'DELAYED',
      'COMPLETE',
      'APPROVED',
      'PENDING',
    ];
    final appState = Provider.of<AppState>(context);

    return Scaffold(
      appBar: AppHeader(title: 'Engineer Flow'),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            OfflineBanner(
              isOffline: appState.isOffline,
              syncStatus: appState.syncStatus,
              toggleOffline: () => appState.toggleOffline(),
            ),
            const SizedBox(height: 8),
            const Text(
              'Welcome, Engineer',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            Expanded(
              child: ListView.separated(
                itemBuilder: (_, idx) => WebCard(
                  title: items[idx],
                  subtitle: 'Detailed description for ${items[idx]}',
                  status: statuses[idx],
                  onTap: () {},
                ),
                separatorBuilder: (_, __) => const SizedBox(height: 12),
                itemCount: items.length,
              ),
            ),
          ],
        ),
      ),
      floatingActionButton: PrimaryButton(
        label: 'Open Labour Flow',
        onPressed: () => Navigator.pushNamed(context, '/labour-flow'),
      ),
    );
  }
}
