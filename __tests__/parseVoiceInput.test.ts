import { describe, it, expect } from 'vitest';
import { parseVoiceInput } from '../lib/parseVoiceInput';

describe('parseVoiceInput', () => {
  it('朝9時から10時まで国語の漢字ドリルをしました', () => {
    const result = parseVoiceInput('朝9時から10時まで国語の漢字ドリルをしました', []);
    expect(result).toHaveLength(1);
    expect(result[0].startTime).toBe('09:00');
    expect(result[0].endTime).toBe('10:00');
    expect(result[0].category).toBe('国語');
    expect(result[0].isCustomCategory).toBe(false);
    expect(result[0].note).toContain('漢字ドリル');
  });

  it('10時半から12時まで数学', () => {
    const result = parseVoiceInput('10時半から12時まで数学', []);
    expect(result).toHaveLength(1);
    expect(result[0].startTime).toBe('10:30');
    expect(result[0].endTime).toBe('12:00');
    expect(result[0].category).toBe('数学');
  });

  it('夕方4時からピアノを1時間', () => {
    const result = parseVoiceInput('夕方4時からピアノを1時間', ['ピアノ']);
    expect(result).toHaveLength(1);
    expect(result[0].startTime).toBe('16:00');
    expect(result[0].endTime).toBe('17:00');
    expect(result[0].category).toBe('ピアノ');
    expect(result[0].isCustomCategory).toBe(true);
  });

  it('9時から国語1時間、その後数学を30分', () => {
    const result = parseVoiceInput('9時から国語1時間、その後数学を30分', []);
    expect(result).toHaveLength(2);
    expect(result[0].startTime).toBe('09:00');
    expect(result[0].endTime).toBe('10:00');
    expect(result[0].category).toBe('国語');
    expect(result[1].startTime).toBe('10:00');
    expect(result[1].endTime).toBe('10:30');
    expect(result[1].category).toBe('数学');
  });

  it('午後2時から英語を1時間半', () => {
    const result = parseVoiceInput('午後2時から英語を1時間半', []);
    expect(result).toHaveLength(1);
    expect(result[0].startTime).toBe('14:00');
    expect(result[0].endTime).toBe('15:30');
    expect(result[0].category).toBe('英語');
  });

  it('夜8時から理科', () => {
    const result = parseVoiceInput('夜8時から理科。夜9時まで', []);
    expect(result[0].startTime).toBe('20:00');
    expect(result[0].category).toBe('理科');
  });

  it('科目が辞書にない場合はその他に分類される', () => {
    const result = parseVoiceInput('9時から10時まで謎の科目', []);
    expect(result).toHaveLength(1);
    expect(result[0].category).toBe('その他');
    expect(result[0].isCustomCategory).toBe(false);
  });

  it('時刻が検出できない場合はそのセグメントを無視する', () => {
    const result = parseVoiceInput('国語をやりました', []);
    expect(result).toHaveLength(0);
  });

  it('カスタム科目を認識する', () => {
    const result = parseVoiceInput('16時から17時までダンス', ['ダンス', 'ピアノ']);
    expect(result).toHaveLength(1);
    expect(result[0].category).toBe('ダンス');
    expect(result[0].isCustomCategory).toBe(true);
  });

  it('9時30分から社会1時間30分', () => {
    const result = parseVoiceInput('9時30分から社会1時間30分', []);
    expect(result).toHaveLength(1);
    expect(result[0].startTime).toBe('09:30');
    expect(result[0].endTime).toBe('11:00');
    expect(result[0].category).toBe('社会');
  });
});
