# 004 Vite + React + TypeScript、zustand、idb-keyval を使う

日付: 2026-10-08

## 状況
スマホ向けの編集 UI を持つ静的サイト。教科書にするため、標準的で説明しやすい構成にしたい。

## 選択肢
- UI: React / Svelte / Vanilla TS
- 状態: zustand / React Context + useReducer / Redux Toolkit
- 永続化: idb-keyval / idb / Dexie

## 決定
Vite + React + TypeScript、状態は zustand、永続化は idb-keyval。

## 理由
React は情報量が最も多く、読者が調べやすい。zustand は React の外（書き出し処理、自動保存）から同じ store に触れて記述量が最小。
idb-keyval は key-value だけで足りる本件に十分で、学習コストがほぼない。
