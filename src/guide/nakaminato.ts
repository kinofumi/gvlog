/** 栞の 1 行分。mapQuery は Google マップで検索する名前（住所を足すと確実） */
export type GuideStop = {
  time: string
  title: string
  note: string
  mapQuery: string
}

export type EventGuide = {
  title: string
  intro: string
  stops: GuideStop[]
  closing: string
}

/**
 * 那珂湊散策の栞（仮）。時間と順路は例なので、当日の都合に合わせて書き換える。
 * 那珂湊駅（ひたちなか海浜鉄道 湊線）を起点に、徒歩で回れる範囲にした。
 */
export const NAKAMINATO: EventGuide = {
  title: '那珂湊散策',
  intro:
    'ひたちなか海浜鉄道 湊線の那珂湊駅に集合。港町を歩いて、おさかな市場で昼食。各スポットで 10 秒の素材を 1 本ずつ作ります。',
  stops: [
    {
      time: '10:00',
      title: '那珂湊駅 集合',
      note: '勝田駅から湊線で約 15 分。駅舎と車両をまず 1 本。',
      mapQuery: '那珂湊駅',
    },
    {
      time: '10:20',
      title: '那珂湊反射炉跡',
      note: '幕末に水戸藩が大砲を鋳造した反射炉の復元。駅から徒歩約 10 分。',
      mapQuery: '那珂湊反射炉跡',
    },
    {
      time: '10:50',
      title: '山上門',
      note: '水戸藩の江戸小石川邸から移された門。反射炉跡のすぐそば。',
      mapQuery: '山上門 ひたちなか市',
    },
    {
      time: '11:10',
      title: '湊公園',
      note: '水戸藩の別荘「夤賓閣」の跡。高台から港と那珂川の河口を一望。',
      mapQuery: '湊公園 ひたちなか市',
    },
    {
      time: '12:00',
      title: '那珂湊おさかな市場',
      note: '昼食と買い物。海鮮丼、回転寿司、干物。混むので早めに。',
      mapQuery: '那珂湊おさかな市場',
    },
    {
      time: '13:30',
      title: '那珂湊漁港・海門橋',
      note: '那珂川の河口と大洗側の眺め。橋の上は風が強い。',
      mapQuery: '海門橋 ひたちなか市',
    },
    {
      time: '14:15',
      title: '那珂湊天満宮',
      note: '8 月の八朔祭で知られる神社。境内でテロップ付きの 1 本。',
      mapQuery: '那珂湊天満宮',
    },
    {
      time: '15:00',
      title: '那珂湊駅 解散',
      note: '余裕があれば湊線で阿字ヶ浦へ。ほしいも神社と海岸。',
      mapQuery: '那珂湊駅',
    },
  ],
  closing:
    '時間と順路は仮です。当日の天気と混み具合で変えます。素材は「動画編集」タブで作ってください。',
}
