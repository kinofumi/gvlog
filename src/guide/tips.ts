/** おすすめポイントの 1 件分。mapQuery があれば Google マップのリンクを出す（場所の名前か、「緯度,経度」。座標ならその地点にピンが立つ） */
export type Tip = {
  title: string
  /** 撮り方のメモ。まだ無い場所は省く */
  note?: string
  mapQuery?: string
}

export type TipsGuide = {
  title: string
  intro: string
  /** 全体の地図（Google マイマップの閲覧用リンク）。あれば一覧の上にリンクを出す */
  mapUrl?: string
  tips: Tip[]
}

/** 交流会の Google マイマップ（閲覧用。編集用のリンクは公開しない） */
const MY_MAP_URL = 'https://www.google.com/maps/d/viewer?mid=1COA8faf2MVGhz66nGOI3nxSqdEghBrA'

/**
 * 那珂湊のおすすめポイント。幹事から届いた Google マイマップ「水戸中心エリアグループ交流会2026」のピン（2026-11-13 時点、20 地点）を、
 * 地図の並びのまま書き写した。座標は KML から取り出したもの。撮り方のメモ（note）は資料に無いので空にしてある（届いたら足す）。
 * 集合・休憩の場所（個人の住所を含むピン）は栞のデータと一緒に扱うのでここには入れない。
 */
export const NAKAMINATO_TIPS: TipsGuide = {
  title: 'おすすめポイント',
  intro:
    '地図に印を付けた場所です。1 か所につき 3〜5 秒の動画か写真を 1 枚で十分です。リンクを開くと Google マップにその地点のピンが立ちます。',
  mapUrl: MY_MAP_URL,
  tips: [
    { title: '那珂湊駅', mapQuery: '36.345106,140.588006' },
    { title: '山上門（ひたちなか市栄町）', mapQuery: '36.343755,140.583616' },
    { title: '那珂湊反射炉跡', mapQuery: '36.343500,140.584138' },
    { title: '水神宮', mapQuery: '36.343758,140.583863' },
    { title: '那珂湊おさかな市場', mapQuery: '36.339773,140.594556' },
    { title: '湊公園', mapQuery: '36.340346,140.589766' },
    { title: '華蔵院', mapQuery: '36.339948,140.585673' },
    { title: '那珂湊天満宮', mapQuery: '36.341433,140.588657' },
    { title: '四郎介稲荷神社', mapQuery: '36.342553,140.590968' },
    { title: '勇稲荷(ゆういなり)神社', mapQuery: '36.344245,140.587023' },
    { title: '那珂湊漁港', mapQuery: '36.341718,140.596497' },
    { title: '夤賓閣（いひんかく）跡', mapQuery: '36.339984,140.590037' },
    { title: '海門橋', mapQuery: '36.336077,140.590717' },
    { title: '海門町ふれあい公園', mapQuery: '36.337690,140.593633' },
    { title: '湊公園ふれあい館', mapQuery: '36.340509,140.588872' },
    { title: '龍神堂', mapQuery: '36.340263,140.586264' },
    { title: '仁王門', mapQuery: '36.339944,140.586502' },
    { title: '華蔵院の梵鐘', mapQuery: '36.339582,140.586082' },
    { title: '商店街', mapQuery: '36.343266,140.594287' },
    { title: '水戸八景「水門帰帆」', mapQuery: '36.343473,140.600185' },
  ],
}
