import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../widgets/app_ui.dart';
import '../widgets/offline_banner.dart';
import '../providers/app_state.dart';

class LabourFlowScreen extends StatelessWidget {
  static const routeName = '/labour-flow';
  const LabourFlowScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final items = List.generate(8, (i) => 'Worker ${i + 1}');
    final statuses = [
      'AVAILABLE',
      'PENDING',
      'ACTIVE',
      'DELAYED',
      'COMPLETE',
      'PENDING',
      'APPROVED',
      'ACTIVE',
    ];
    final appState = Provider.of<AppState>(context);

    return Scaffold(
      appBar: AppHeader(title: 'Labour Flow'),
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
            const Text(
              'Labour dashboard',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            Expanded(
              child: ListView.builder(
                itemCount: items.length,
                itemBuilder: (_, idx) => WebCard(
                  title: items[idx],
                  subtitle: 'Status: ${statuses[idx]}',
                  status: statuses[idx],
                  onTap: () {},
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
