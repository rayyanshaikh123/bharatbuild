import 'dart:io';
import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';

class BillParserService {
  /// Parses the text from an image file and extracts vendor name, bill number,
  /// GST percentage, and total amount.
  Future<Map<String, dynamic>> parseBill(File imageFile) async {
    final inputImage = InputImage.fromFile(imageFile);
    final textRecognizer = TextRecognizer(script: TextRecognitionScript.latin);
    
    try {
      final RecognizedText recognizedText = await textRecognizer.processImage(inputImage);
      return _extractData(recognizedText.text);
    } catch (e) {
      throw Exception('Failed to recognize text: $e');
    } finally {
      textRecognizer.close();
    }
  }

  /// Rules-based extraction logic
  Map<String, dynamic> _extractData(String text) {
    String? vendorName;
    String? billNumber;
    double? totalAmount;
    double? gstAmount;

    // Split text into lines for line-by-line analysis
    final lines = text.split('\n');
    
    // 1. Vendor Name: Usually at the top (first non-empty line)
    for (var line in lines) {
      if (line.trim().isNotEmpty && line.length > 3) {
        // Simple heuristic: First significant line is often the vendor
        // Avoid "Invoice", "Bill", etc.
        if (!line.toLowerCase().contains('invoice') && 
            !line.toLowerCase().contains('bill') &&
            !line.toLowerCase().contains('gst') &&
            !line.toLowerCase().contains('date')) {
          vendorName = line.trim();
          break;
        }
      }
    }

    // 2. Bill Number: Look for keywords "Invoice No", "Bill No", etc.
    final billNoRegex = RegExp(r'(?i)(invoice|bill)\s*(no|number|num|#)\.?\s*[:\-\s]?\s*([a-zA-Z0-9\-/]+)');
    final matchBill = billNoRegex.firstMatch(text);
    if (matchBill != null && matchBill.groupCount >= 3) {
      billNumber = matchBill.group(3);
    }
    
    // 3. GST Amount: Look for "GST", "IGST", "SGST", "CGST" followed by amount
    // Often GST amounts appear near the total. This is tricky with simple regex.
    // Let's look for explicitly labeled GST lines.
    final gstRegex = RegExp(r'(?i)(total)?\s*(gst|tax)\s*[:\-\s]?\s*([\d,]+\.?\d{0,2})');
    final matchGst = gstRegex.firstMatch(text);
    if (matchGst != null && matchGst.groupCount >= 3) {
       String amountStr = matchGst.group(3)!.replaceAll(',', '');
       gstAmount = double.tryParse(amountStr);
    }

    // 4. Total Amount: Look for "Total", "Grand Total", "Net Amount"
    // Usually the largest number at the bottom, or labeled explicitly.
    final totalRegex = RegExp(r'(?i)(grand|net|total)\s*(amount|total)?\s*[:\-\s]?\s*([\d,]+\.?\d{0,2})');
    final matchesTotal = totalRegex.allMatches(text);
    
    double maxFound = 0.0;
    for (var m in matchesTotal) {
      if (m.groupCount >= 3) {
        String amountStr = m.group(3)!.replaceAll(',', '');
        double? val = double.tryParse(amountStr);
        if (val != null && val > maxFound) {
          maxFound = val;
        }
      }
    }
    
    // Fallback: search strictly for currency patterns if no "Total" label found
    if (maxFound == 0.0) {
      // Find all numbers with decimals
      final moneyRegex = RegExp(r'\b\d{1,3}(,\d{3})*(\.\d{2})\b');
      final moneyMatches = moneyRegex.allMatches(text);
      for (var m in moneyMatches) {
        String amountStr = m.group(0)!.replaceAll(',', '');
        double? val = double.tryParse(amountStr);
        if (val != null && val > maxFound) {
          maxFound = val;
        }
      }
    }
    
    if (maxFound > 0) totalAmount = maxFound;

    return {
      'vendor_name': vendorName,
      'bill_number': billNumber,
      'total_amount': totalAmount,
      'gst_amount': gstAmount,
    };
  }
}
