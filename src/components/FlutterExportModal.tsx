import React, { useState } from 'react';
import { X, Copy, Check, Download, Code, Smartphone, Terminal, Layers } from 'lucide-react';

interface FlutterExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string, type: 'info' | 'success' | 'warning' | 'error') => void;
}

export const FlutterExportModal: React.FC<FlutterExportModalProps> = ({ isOpen, onClose, onShowToast }) => {
  const [activeFile, setActiveFile] = useState<'main' | 'model' | 'service' | 'map' | 'pubspec'>('main');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const flutterFiles: Record<string, { name: string; lang: string; code: string }> = {
    pubspec: {
      name: 'pubspec.yaml',
      lang: 'yaml',
      code: `name: pabs_pro_app
description: "App móvil oficial PABS Pro para Android - Cobranza en campo, GPS y gestión de rutas."
publish_to: 'none'
version: 1.0.0+1

environment:
  sdk: '>=3.2.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter
  flutter_map: ^6.1.0
  latlong2: ^0.9.0
  url_launcher: ^6.2.4
  http: ^1.2.0
  shared_preferences: ^2.2.2
  intl: ^0.19.0
  geolocator: ^11.0.0
  excel: ^4.0.3

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0

flutter:
  uses-material-design: true
`,
    },
    main: {
      name: 'lib/main.dart',
      lang: 'dart',
      code: `import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'screens/map_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      systemNavigationBarColor: Color(0xFF0F172A),
      systemNavigationBarIconBrightness: Brightness.light,
    ),
  );
  runApp(const PabsProApp());
}

class PabsProApp extends StatelessWidget {
  const PabsProApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'PABS Pro - Rodrigo Valencia',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF0F172A),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFFF97316),
          secondary: Color(0xFF6366F1),
          surface: Color(0xFF1E293B),
          error: Color(0xFFEF4444),
        ),
        fontFamily: 'Inter',
      ),
      home: const MapScreen(),
    );
  }
}
`,
    },
    model: {
      name: 'lib/models/cliente_pabs.dart',
      lang: 'dart',
      code: `import 'dart:convert';

class ClientePABS {
  final String idEnrutar;
  final String idAfiliado;
  final String contrato;
  final String nombre;
  final String direccion;
  final String colonia;
  final String telefono;
  final String periodicidad;
  final int sa; // Dias sin abonar
  final String diaPago;
  final String fechaVisita;
  final String fechaPago;
  final double saldo;
  final double montoAporte;
  final String ultimoMotivo;
  final String ultimoComentario;
  final double? lat;
  final double? lon;
  final bool tieneApp;
  String? pausadoHasta;
  String? volverDia;

  ClientePABS({
    required this.idEnrutar,
    required this.idAfiliado,
    required this.contrato,
    required this.nombre,
    required this.direccion,
    required this.colonia,
    required this.telefono,
    required this.periodicidad,
    required this.sa,
    required this.diaPago,
    required this.fechaVisita,
    required this.fechaPago,
    required this.saldo,
    required this.montoAporte,
    required this.ultimoMotivo,
    required this.ultimoComentario,
    this.lat,
    this.lon,
    this.tieneApp = false,
    this.pausadoHasta,
    this.volverDia,
  });

  // Calculo ciclo operativo PABS (Jueves a Miercoles)
  bool esDiaDePagoHoy() {
    final hoy = DateTime.now();
    final pUpper = periodicidad.toUpperCase();
    final dUpper = diaPago.toUpperCase();
    final diaSemanaNombres = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];

    if (pausadoHasta != null && pausadoHasta!.compareTo(hoy.toIso8601String().substring(0, 10)) > 0) {
      return false;
    }

    if (pUpper.contains('SEMANAL')) {
      final diaActualNombre = diaSemanaNombres[hoy.weekday % 7];
      return dUpper.contains(diaActualNombre);
    } else if (pUpper.contains('QUINCENAL')) {
      return hoy.day == 15 || hoy.day == 30 || hoy.day == 31;
    } else if (pUpper.contains('MENSUAL')) {
      return hoy.day == 1 || hoy.day == 15;
    }
    return sa >= 7;
  }
}
`,
    },
    service: {
      name: 'lib/services/pabs_service.dart',
      lang: 'dart',
      code: `import 'package:http/http.dart' as http;
import 'package:url_launcher/url_launcher.dart';
import '../models/cliente_pabs.dart';

class PabsService {
  // Disparo de baliza a servidor PHP
  static Future<void> enviarIncidenciaServidor({
    required String idAfiliado,
    required int motivo,
    required String comentario,
  }) async {
    final url = Uri.parse(
      'https://webrigo.devlara.us.ci/addinci.php?id=879&afil=$idAfiliado&dia=&m=$motivo&come=\${Uri.encodeComponent(comentario)}',
    );
    try {
      await http.get(url);
    } catch (e) {
      // Ignorar errores CORS o de red en baliza rapida
    }
  }

  // Enviar WhatsApp via baliza / API al servidor (api_wha)
  static Future<void> enviarWhatsApp(ClientePABS cliente) async {
    final numClean = cliente.telefono.replaceAll(RegExp(r'\D'), '');
    final tel10 = numClean.length >= 10 ? numClean.substring(numClean.length - 10) : numClean;
    
    String mensaje = '';
    if (cliente.sa > 90) {
      mensaje = '🚨 AVISO DE ÚLTIMA HORA 🚨\\n\\nEstimado/a \${cliente.nombre}, le saluda Rodrigo Valencia de PABS.\\n\\nSu plan presenta atraso crítico de \${cliente.sa} días. Favor de comunicarse hoy.';
    } else if (cliente.sa > 7) {
      mensaje = 'Hola \${cliente.nombre}, de cobranza PABS notamos que su cuenta registra un atraso de \${cliente.sa} días. ¿Podríamos confirmar su pago hoy?';
    } else {
      mensaje = 'Hola \${cliente.nombre}, le saludamos de PABS recordando que su fecha programada de aportación es el \${cliente.diaPago}. ¡Excelente día!';
    }

    final urlApi = Uri.parse('https://rigo.devlara.us.ci/apiwha.php?a=msg&numero=$tel10&mensaje=\${Uri.encodeComponent(mensaje)}');
    try {
      await http.get(urlApi);
    } catch (e) {
      // Ignorar errores de red en baliza
    }
  }
}
`,
    },
    map: {
      name: 'lib/screens/map_screen.dart',
      lang: 'dart',
      code: `import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../models/cliente_pabs.dart';

class MapScreen extends StatefulWidget {
  const MapScreen({super.key});

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  final MapController _mapController = MapController();
  String _currentRoute = 'A';
  bool _isGpsOn = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('PABS PRO 🏍️', style: TextStyle(fontWeight: FontWeight.w900)),
        backgroundColor: const Color(0xFF0F172A),
        actions: [
          DropdownButton<String>(
            value: _currentRoute,
            dropdownColor: const Color(0xFF1E293B),
            items: ['A', 'B', 'C', 'D', 'EMISION'].map((r) {
              return DropdownMenuItem(value: r, child: Text('RUTA \$r'));
            }).toList(),
            onChanged: (val) => setState(() => _currentRoute = val ?? 'A'),
          ),
          IconButton(
            icon: const Icon(Icons.sync, color: Color(0xFFF97316)),
            onPressed: () {},
          ),
        ],
      ),
      body: FlutterMap(
        mapController: _mapController,
        options: const MapOptions(
          initialCenter: LatLng(29.0892, -110.9613), // Hermosillo, Sonora
          initialZoom: 13.0,
        ),
        children: [
          TileLayer(
            urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            userAgentPackageName: 'com.pabs.pro.app',
          ),
          // Markers Layer con pulsos y colores segun dias sin abonar
        ],
      ),
      floatingActionButton: FloatingActionButton(
        backgroundColor: _isGpsOn ? Colors.green : const Color(0xFF6366F1),
        onPressed: () => setState(() => _isGpsOn = !_isGpsOn),
        child: const Icon(Icons.two_wheeler),
      ),
    );
  }
}
`,
    },
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(flutterFiles[activeFile].code);
    setCopied(true);
    onShowToast(`📋 ${flutterFiles[activeFile].name} copiado al portapapeles`, 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadAll = () => {
    // Generate text bundle with all files
    let bundle = `=== PABS PRO - PROYECTO FLUTTER COMPLETO PARA ANDROID ===\n\n`;
    Object.entries(flutterFiles).forEach(([key, val]) => {
      bundle += `\n\n----------------- ARCHIVO: ${val.name} -----------------\n\n`;
      bundle += val.code;
    });

    const blob = new Blob([bundle], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pabs_pro_flutter_codebase.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    onShowToast(`📥 Código fuente de Flutter descargado con éxito`, 'success');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-center items-center p-3 sm:p-5">
      <div className="w-full max-w-3xl bg-slate-900 border border-indigo-500/40 rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col text-slate-100">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
              📱
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-tight flex items-center gap-2">
                <span>CÓDIGO FLUTTER (ANDROID APP)</span>
                <span className="text-[10px] bg-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded-full font-mono">
                  Dart / Flutter 3.x
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">Archivos nativos listos para compilar en APK</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadAll}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition"
            >
              <Download className="w-3.5 h-3.5" />
              Descargar Todo
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* File Tabs */}
        <div className="px-4 py-2 border-b border-white/5 bg-slate-950/40 flex items-center gap-1.5 overflow-x-auto">
          {Object.entries(flutterFiles).map(([key, file]) => (
            <button
              key={key}
              onClick={() => setActiveFile(key as 'main' | 'model' | 'service' | 'map' | 'pubspec')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 shrink-0 ${
                activeFile === key
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              {file.name}
            </button>
          ))}
        </div>

        {/* Code Content */}
        <div className="flex-1 overflow-hidden flex flex-col relative bg-slate-950/80">
          <div className="absolute top-3 right-4 z-10">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 shadow-lg border border-white/10 active:scale-95 transition backdrop-blur-sm"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copiado!' : 'Copiar Archivo'}
            </button>
          </div>

          <pre className="flex-1 overflow-auto p-4 text-xs font-mono text-emerald-300/90 leading-relaxed">
            <code>{flutterFiles[activeFile].code}</code>
          </pre>
        </div>

        {/* Build instructions footer */}
        <div className="px-5 py-3 border-t border-white/10 bg-slate-950 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-orange-400 shrink-0" />
            <span>
              Para compilar tu APK: <code className="bg-slate-800 px-2 py-0.5 rounded text-white font-mono font-bold">flutter build apk --release</code>
            </span>
          </div>
          <div className="text-[11px] text-slate-500">
            La app también se puede instalar directamente como PWA en Android desde el menú superior.
          </div>
        </div>
      </div>
    </div>
  );
};
