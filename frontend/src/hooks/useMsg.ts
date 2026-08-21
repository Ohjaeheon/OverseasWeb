import { useMessageDictionary } from '../contexts/MessageDictionaryContext';

/** 메시지 사전에서 key에 해당하는 값을 찾아 반환한다. 미등록 키면 "__" + fallback을 반환한다. */
export function useMsg(key: string, fallback: string): string {
  const { getMsg } = useMessageDictionary();
  return getMsg(key, fallback);
}
