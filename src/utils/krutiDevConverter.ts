
export const convertKrutiToUnicode = (krutiText: string): string => {
  if (!krutiText) return krutiText;
  
  // Standard Kruti Dev 010 to Unicode Mapping (Comprehensive)
  const array_one = [
    "ñ","ò","ó","ô","õ","ö","÷","ø","ù","ú","û","ü","ý","þ","ÿ",
    "!", "\"", "#", "$", "%", "&", "'", "(", ")", "*", "+", ",", "-", ".", "/",
    "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", ":", ";", "<", "=", ">", "?",
    "@", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",
    "[", "\\", "]", "^", "_", "`", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z",
    "{", "|", "}", "~"
  ];

  const array_two = [
    "रु","जा","ज्","त्","त्र","त्त","श्र","प्र","द्र","दृ","प्र","फ्र","्र","ा","्र",
    "अ", "अा", "अै", "अाे", "अाै", "अ", "ॅ", "(", ")", "ै", "+", "ो", "-", "।", "र",
    "०", "१", "२", "३", "४", "५", "६", "७", "८", "९", ":", ";", "<", "=", "ा", "?",
    "@", "म", "ब", "क", "ध", "ज", "थ", "ि", "प", "व", "न", "त", "ल", "श", "ल्", "ओ", "प", "फ", "ी", "स", "ह", "ा", "न", "ू", "ं", "े", "ै",
    "ृ", "इ", "ई", "उ", "ऊ", "े", "इ", "ई", "उ", "ऊ", "े", "अा", "ा", "ि", "ी", "ु", "ू", "ृ", "े", "ै", "ो", "ौ", "ं", "ः", "्र", "ज्ञ", "दृ", "छ", "़", "्", "ा",
    "ा", "ा", "ा", "ा"
  ];

  let modifiedText = krutiText;

  // Process mapping
  for (let i = 0; i < array_one.length; i++) {
    modifiedText = modifiedText.split(array_one[i]).join(array_two[i]);
  }

  // Handle 'i' vowel placement (fixes "Gi" -> "वि")
  const chars = Array.from(modifiedText);
  let finalChars = [];
  for (let i = 0; i < chars.length; i++) {
    if (chars[i] === 'ि' && i < chars.length - 1) {
      // Look for the next unit (could be a conjunct)
      let nextChar = chars[i+1];
      finalChars.push(nextChar);
      finalChars.push('ि');
      i++;
    } else {
      finalChars.push(chars[i]);
    }
  }

  return finalChars.join('');
};
