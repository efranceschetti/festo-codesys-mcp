/**
 * BM25 Query Benchmark Harness
 *
 * Gated by env BENCH=1 — does not run in CI by default.
 * Establishes a baseline for `plc_knowledge` query latency so future
 * changes can be measured against a known number rather than vibes.
 *
 * Run: `BENCH=1 npm test` or `npm run test:bench`
 */

import { describe, it } from 'node:test';
import { tokenize, BM25 } from '../services/bm25.js';

const BENCH_ENABLED = process.env.BENCH === '1';

describe('BM25 query latency benchmark', { skip: !BENCH_ENABLED }, () => {
  // Synthetic corpus shaped like our knowledge base (~30 chunks per "doc",
  // 16 docs ≈ ~500 chunks total — mirrors the real index order of magnitude).
  const buildCorpus = (): string[][] => {
    const seedDocs = [
      'EtherCAT CiA 402 controlword statusword PDS Power Disabled SwitchOn Operation Enabled QuickStop Fault state machine',
      'Festo CMMT-AS servo drive AC three-phase mains 230V firmware EtherCAT CiA 402 PtP positioning safe torque off STO',
      'Festo CMMT-ST stepper drive EMMT-ST motor BiSS-C absolute encoder homing method 37 no physical motion EtherCAT',
      'Festo VTUX valve terminal CPX-AP-A CPX-AP-I pneumatic islands solenoid valves IO-Link',
      'Festo CDPX HMI Designer Studio TargetVisu WebVisu CODESYS visualization touchscreen',
      'PLCopen Motion Control TC2 Part 1 MC_Power MC_Home MC_MoveAbsolute MC_MoveRelative MC_Stop MC_Reset MC_ReadStatus',
      'PLCopen Motion Control TC2 Part 4 coordinated motion axis group MC_GroupEnable MC_MoveLinearAbsolute buffer mode blending',
      'PLCopen XML TC6 v2.01 fileHeader contentHeader types pous instances configurations resource task',
      'IEC 61131-3 Structured Text BOOL INT DINT REAL TIME ARRAY STRUCT ENUM TYPE END_TYPE FUNCTION_BLOCK',
      'CODESYS V3.5 SP22 IIoT Libraries SL MQTT Client SL JSON Utilities SL Web Client SL OPC UA Client',
      'CODESYS Modbus V4.5 master slave TCP RTU function code holding registers coils discrete inputs',
      'CODESYS EtherCAT master slave ESI XML CoE PDO mapping startup parameter object dictionary state machine',
      'Hungarian notation prefix bool b nInt rReal tTime fbInstance ePLCenum stStruct PascalCase abbreviations',
      'Function Block FB interface bEnable bExecute bDone bBusy bErr nErrId nState IDLE WORKING DONE ERROR state machine',
      'Weintek cMT X HMI EasyBuilder Pro tag system address space PLC communication driver',
      'OpenPLC v4 Autonomy Edge runtime architecture REST API HTTPS port 8443 JWT JSON Flask C runtime SCHED_FIFO',
    ];

    const corpus: string[][] = [];
    for (const seed of seedDocs) {
      // Each seed becomes ~30 chunk variants by appending unique padding tokens
      for (let i = 0; i < 30; i++) {
        corpus.push(tokenize(`${seed} chunk_${i} variant_${i % 7} section_${i % 4}`));
      }
    }
    return corpus;
  };

  const queries = [
    'festo-ptp MC_MoveAbsolute',
    'homing method 37 absolute encoder',
    'CiA 402 controlword 0x6040',
    'CMMT fault recovery',
    'CDPX HMI configuration',
    'PLCopen XML pou interface variables',
    'Hungarian notation FB prefix',
    'state machine IDLE DONE ERROR',
    'MQTT publish JSON utilities',
    'EtherCAT PDO mapping',
    'Modbus holding register coil',
    'OpenPLC runtime port 8443',
    'CODESYS V3.5 SP22 release',
    'VTUX valve terminal IO-Link',
    'Designer Studio WebVisu',
    'Weintek tag system',
    'IEC 61131 Structured Text BOOL',
    'CMMT-ST BiSS-C stepper',
    'TC2 Part 4 coordinated motion',
    'safe torque off STO',
  ];

  const percentile = (sorted: number[], p: number): number =>
    sorted[Math.min(Math.floor((sorted.length - 1) * p), sorted.length - 1)];

  it('measures p50/p95/p99 latency over 1000 queries', () => {
    const corpus = buildCorpus();
    const bm25 = new BM25();

    const fitStart = process.hrtime.bigint();
    bm25.fit(corpus);
    const fitMs = Number(process.hrtime.bigint() - fitStart) / 1_000_000;

    const rssBefore = process.memoryUsage().rss;

    // Warm-up — JIT settles, branch predictor learns
    for (let i = 0; i < 100; i++) {
      bm25.search(tokenize(queries[i % queries.length]), 10);
    }

    const samples: number[] = [];
    const N = 1000;
    for (let i = 0; i < N; i++) {
      const query = queries[i % queries.length];
      const t0 = process.hrtime.bigint();
      bm25.search(tokenize(query), 10);
      const t1 = process.hrtime.bigint();
      samples.push(Number(t1 - t0) / 1_000_000);
    }

    samples.sort((a, b) => a - b);
    const rssAfter = process.memoryUsage().rss;

    const report = {
      corpus_size: corpus.length,
      fit_ms: fitMs.toFixed(2),
      queries: N,
      p50_ms: percentile(samples, 0.50).toFixed(3),
      p95_ms: percentile(samples, 0.95).toFixed(3),
      p99_ms: percentile(samples, 0.99).toFixed(3),
      max_ms: samples[samples.length - 1].toFixed(3),
      rss_before_mb: (rssBefore / 1024 / 1024).toFixed(1),
      rss_after_mb: (rssAfter / 1024 / 1024).toFixed(1),
      rss_delta_mb: ((rssAfter - rssBefore) / 1024 / 1024).toFixed(1),
    };

    console.log('\nBM25 BENCHMARK\n' + JSON.stringify(report, null, 2) + '\n');
  });
});
