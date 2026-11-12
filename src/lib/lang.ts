/**
 * 한국어 페이지 안의 영어 문구에 붙일 lang 값. 한글이 하나도 없고 영문자가 있으면 'en', 아니면 undefined.
 * 화면낭독기가 영어 문구를 한국어 발음으로 읽지 않게 하려는 것입니다.
 *   <p lang={langOf(text)}>{text}</p>
 */
export const langOf = (text: string | null | undefined): 'en' | undefined =>
  text && /[A-Za-z]/.test(text) && !/[ᄀ-ᇿ㄰-㆏가-힣]/.test(text) ? 'en' : undefined;
