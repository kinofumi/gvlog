/** おすすめポイントの 1 件分。mapQuery があれば Google マップのリンクを出す */
export type Tip = {
  title: string
  note: string
  mapQuery?: string
}

export type TipsGuide = {
  title: string
  intro: string
  tips: Tip[]
}

/**
 * 那珂湊散策のおすすめポイント（仮）。資料が届いたら差し替える。
 * 「どこで、何を撮ると素材になるか」を 1 件ずつ短く書く。
 */
export const NAKAMINATO_TIPS: TipsGuide = {
  title: 'おすすめポイント',
  intro:
    '撮っておくと動画がまとまりやすい場面です。1 か所につき 3〜5 秒の動画か写真を 1 枚で十分です。',
  tips: [
    {
      title: '湊線の車両と駅舎',
      note: '那珂湊駅のホームで、到着か発車の瞬間を横から。駅名標も 1 枚。',
      mapQuery: '那珂湊駅',
    },
    {
      title: 'おさかな市場の活気',
      note: '店先の売り声と並んだ魚を低い位置から。食べたものは手元を寄りで。',
      mapQuery: '那珂湊おさかな市場',
    },
    {
      title: '海門橋からの河口',
      note: '橋の中ほどから大洗側へ、ゆっくり横に振る。風が強いので手すりに肘を付けて。',
      mapQuery: '海門橋',
    },
    {
      title: '反射炉と空',
      note: '下から見上げて縦に。晴れていれば空を多めに入れると映える。',
      mapQuery: '那珂湊反射炉跡',
    },
    {
      title: '歩いている自分たち',
      note: '路地や坂道を後ろから。顔が映らなくても足元と背中で十分伝わる。',
    },
  ],
}
