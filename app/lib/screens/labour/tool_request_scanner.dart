import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../services/auth_service.dart';
import '../../providers/auth_providers.dart';

class ToolRequestScanner extends ConsumerStatefulWidget {
  const ToolRequestScanner({super.key});

  @override
  ConsumerState<ToolRequestScanner> createState() => _ToolRequestScannerState();
}

class _ToolRequestScannerState extends ConsumerState<ToolRequestScanner> {
  final MobileScannerController _controller = MobileScannerController();
  bool _isScanning = true;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _onDetect(BarcodeCapture capture) async {
    if (!_isScanning) return;
    
    final List<Barcode> barcodes = capture.barcodes;
    if (barcodes.isEmpty) return;

    final String? code = barcodes.first.rawValue;
    if (code == null || code.isEmpty) return;

    setState(() => _isScanning = false);
    _controller.stop();

    try {
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (_) => const Center(child: CircularProgressIndicator()),
      );

      final authService = ref.read(authServiceProvider);
      final result = await authService.scanQRCode(code);

      if (mounted) {
        Navigator.pop(context); // Remove loader
        
        final action = result['action'] ?? '';
        final toolName = result['tool']?['name'] ?? 'Tool';
        
        showDialog(
          context: context,
          builder: (context) => AlertDialog(
            title: Text(action == 'ISSUED' ? 'Tool Issued' : 'Tool Returned'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.check_circle, color: Colors.green, size: 48),
                const SizedBox(height: 16),
                Text(
                  action == 'ISSUED' 
                    ? 'You have successfully taken: $toolName'
                    : 'You have successfully returned: $toolName',
                  textAlign: TextAlign.center,
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () {
                  Navigator.pop(context); // Close dialog
                  Navigator.pop(context); // Return to shift screen
                },
                child: const Text('OK'),
              ),
            ],
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        Navigator.pop(context); // Remove loader
        String msg = e.toString().replaceAll('Exception: ', '');
        if (msg.contains(':')) msg = msg.split(':').last.trim();

        showDialog(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Scan Failed'),
            content: Text(msg),
            actions: [
              TextButton(
                onPressed: () {
                  Navigator.pop(context);
                  setState(() => _isScanning = true);
                  _controller.start();
                },
                child: const Text('Try Again'),
              ),
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Cancel'),
              ),
            ],
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Scan Tool QR'),
        elevation: 0,
      ),
      body: Stack(
        children: [
          MobileScanner(
            controller: _controller,
            onDetect: _onDetect,
          ),
          // Overlay
          Center(
            child: Container(
              width: 250,
              height: 250,
              decoration: BoxDecoration(
                border: Border.all(color: Colors.white, width: 2),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Stack(
                children: [
                  Positioned(
                    top: 0,
                    left: 0,
                    child: Container(width: 40, height: 40, decoration: const BoxDecoration(border: Border(top: BorderSide(color: Colors.blue, width: 6), left: BorderSide(color: Colors.blue, width: 6)), borderRadius: BorderRadius.only(topLeft: Radius.circular(20))))),
                  Positioned(
                    top: 0,
                    right: 0,
                    child: Container(width: 40, height: 40, decoration: const BoxDecoration(border: Border(top: BorderSide(color: Colors.blue, width: 6), right: BorderSide(color: Colors.blue, width: 6)), borderRadius: BorderRadius.only(topRight: Radius.circular(20))))),
                  Positioned(
                    bottom: 0,
                    left: 0,
                    child: Container(width: 40, height: 40, decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: Colors.blue, width: 6), left: BorderSide(color: Colors.blue, width: 6)), borderRadius: BorderRadius.only(bottomLeft: Radius.circular(20))))),
                  Positioned(
                    bottom: 0,
                    right: 0,
                    child: Container(width: 40, height: 40, decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: Colors.blue, width: 6), right: BorderSide(color: Colors.blue, width: 6)), borderRadius: BorderRadius.only(bottomRight: Radius.circular(20))))),
                ],
              ),
            ),
          ),
          Positioned(
            bottom: 80,
            left: 0,
            right: 0,
            child: Center(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.5),
                  borderRadius: BorderRadius.circular(30),
                ),
                child: const Text(
                  'Point camera at tool QR code',
                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
