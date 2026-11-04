'use client';

import React, { useState, useEffect } from 'react';

interface Fish {
  id: string;
  name: string;
  grade: 'common' | 'rare' | 'epic' | 'legendary';
  price: number;
  icon: string;
}

const FISH_LIST: Fish[] = [
  { id: 'f1', name: '피라미', grade: 'common', price: 100, icon: '🐟' },
  { id: 'f2', name: '붕어', grade: 'common', price: 200, icon: '🐠' },
  { id: 'f3', name: '잉어', grade: 'rare', price: 500, icon: '🐡' },
  { id: 'f4', name: '연어', grade: 'rare', price: 800, icon: '🐟' },
  { id: 'f5', name: '상어', grade: 'epic', price: 2500, icon: '🦈' },
  { id: 'f6', name: '황금 고래', grade: 'legendary', price: 10000, icon: '🐳' },
];

export default function FishingWidget() {
  const [status, setStatus] = useState<'idle' | 'waiting' | 'hooked' | 'caught'>('idle');
  const [money, setMoney] = useState<number>(1000);
  const [inventory, setInventory] = useState<{ [key: string]: number }>({});
  const [lastCaught, setLastCaught] = useState<Fish | null>(null);
  const [message, setMessage] = useState<string>('낚싯대를 던져 물고기를 잡아보세요!');

  // 로컬 스토리지 불러오기
  useEffect(() => {
    const savedMoney = localStorage.getItem('fishing_money');
    const savedInv = localStorage.getItem('fishing_inv');
    if (savedMoney) setMoney(Number(savedMoney));
    if (savedInv) setInventory(JSON.parse(savedInv));
  }, []);

  // 로컬 스토리지 저장
  useEffect(() => {
    localStorage.setItem('fishing_money', money.toString());
    localStorage.setItem('fishing_inv', JSON.stringify(inventory));
  }, [money, inventory]);

  // 낚싯대 던지기
  const startFishing = () => {
    if (status !== 'idle') return;
    setStatus('waiting');
    setMessage('물고기의 입질을 기다리는 중...');

    const waitTime = Math.random() * 3000 + 2000; // 2~5초 대기
    setTimeout(() => {
      setStatus('hooked');
      setMessage('앗! 입질이 왔습니다! 릴을 감으세요!!');
    }, waitTime);
  };

  // 릴 감기 (낚아채기)
  const reelIn = () => {
    if (status !== 'hooked') return;

    const rand = Math.random() * 100;
    let selectedFish: Fish;

    if (rand < 50) {
      selectedFish = FISH_LIST[0];
    } else if (rand < 80) {
      selectedFish = FISH_LIST[1];
    } else if (rand < 93) {
      selectedFish = FISH_LIST[2];
    } else if (rand < 98) {
      selectedFish = FISH_LIST[3];
    } else if (rand < 99.5) {
      selectedFish = FISH_LIST[4];
    } else {
      selectedFish = FISH_LIST[5];
    }

    setLastCaught(selectedFish);
    setMoney((prev) => prev + selectedFish.price);
    setInventory((prev) => ({
      ...prev,
      [selectedFish.id]: (prev[selectedFish.id] || 0) + 1,
    }));
    setStatus('caught');
    setMessage(`성공! [${selectedFish.name}] (${selectedFish.icon})을(를) 잡았습니다! (+${selectedFish.price}원)`);

    setTimeout(() => {
      setStatus('idle');
    }, 2000);
  };

  return (
    <div className="p-4 flex flex-col items-center justify-center bg-blue-50 dark:bg-slate-900 rounded-lg text-slate-800 dark:text-slate-100 select-none w-full">
      <div className="text-lg font-bold mb-2">🌊 힐링 바다 낚시 위젯</div>
      <div className="flex justify-between w-full max-w-xs mb-3 text-sm px-3 py-1.5 bg-white/60 dark:bg-slate-800/60 rounded-md shadow-sm">
        <span>💰 소지금:</span>
        <strong className="text-blue-600 dark:text-blue-400">{money.toLocaleString()}원</strong>
      </div>

      <div className="w-full h-36 bg-blue-200 dark:bg-blue-950 rounded-lg flex flex-col items-center justify-center relative overflow-hidden border border-blue-300 dark:border-blue-800 mb-4 shadow-inner">
        <div className="absolute inset-0 opacity-25 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px]"></div>
        
        {status === 'idle' && <div className="text-4xl animate-bounce">🎣</div>}
        {status === 'waiting' && <div className="text-4xl animate-pulse">🌊 둥실둥실...</div>}
        {status === 'hooked' && <div className="text-5xl animate-bounce text-red-500 font-extrabold">🚨 입질 폭발! 🚨</div>}
        {status === 'caught' && lastCaught && (
          <div className="text-4xl animate-bounce flex flex-col items-center">
            <span>{lastCaught.icon}</span>
            <span className="text-xs font-bold mt-1 text-emerald-600 dark:text-emerald-400">+{lastCaught.price}원</span>
          </div>
        )}

        <div className="absolute bottom-2 text-xs font-medium bg-black/50 text-white px-3 py-1 rounded-full backdrop-blur-sm">
          {message}
        </div>
      </div>

      <div className="w-full max-w-xs">
        {status === 'hooked' ? (
          <button
            onClick={reelIn}
            className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl shadow-lg transition transform active:scale-95 animate-pulse cursor-pointer"
          >
            낚싯채기! (릴 감기)
          </button>
        ) : (
          <button
            onClick={startFishing}
            disabled={status === 'waiting' || status === 'caught'}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-400 text-white font-bold rounded-xl shadow-md transition transform active:scale-95 cursor-pointer"
          >
            {status === 'waiting' ? '찌를 보는 중...' : '낚싯대 던지기'}
          </button>
        )}
      </div>

      {/* 물고기 도감 및 인벤토리 현황 */}
      <div className="mt-4 w-full max-w-xs text-xs bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="font-semibold mb-2 text-slate-700 dark:text-slate-300">🐟 잡은 물고기 도감</div>
        <div className="grid grid-cols-3 gap-2">
          {FISH_LIST.map((fish) => (
            <div key={fish.id} className="flex flex-col items-center p-1.5 bg-slate-50 dark:bg-slate-900 rounded border border-slate-100 dark:border-slate-800">
              <span className="text-xl">{fish.icon}</span>
              <span className="truncate w-full text-center text-[10px] mt-0.5">{fish.name}</span>
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                {inventory[fish.id] || 0}마리
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
