const fs = require('fs');

const updates = {
  "minor-wands-ace": {
    "intro": {
      "vi": "Ace of Wands mang năng lượng của tia lửa đầu tiên thắp sáng bầu trời đêm. Lá bài không hứa hẹn một ngọn lửa vĩnh cửu, mà trao cho bạn mầm mống của một niềm đam mê hoặc ý tưởng mới đang vẫy gọi.",
      "en": "Ace of Wands carries the energy of the first spark lighting up the night sky. The card does not promise an eternal flame, but hands you the seed of a new passion or idea beckoning you forward."
    },
    "personalityPortrait": {
      "vi": "Như một người bạn mang đến tin vui, Ace of Wands truyền cho bạn sự phấn khích thuần túy. Họ nhắc nhở bạn hãy nắm lấy nguồn cảm hứng này trước khi sự hoài nghi kịp kéo đến.",
      "en": "Like a friend bringing good news, Ace of Wands fills you with pure excitement. They remind you to grasp this inspiration before doubt has a chance to creep in."
    }
  },
  "minor-wands-two": {
    "intro": {
      "vi": "Two of Wands mang năng lượng của người đứng trước ngã rẽ và ngắm nhìn những chân trời xa. Lá bài mời bạn tự hỏi: sự an toàn hiện tại đã đủ, hay một ngọn lửa khao khát vẫn đang thôi thúc bạn khám phá?",
      "en": "Two of Wands carries the energy of one standing at a crossroads, gazing at distant horizons. The card invites you to ask: is current safety enough, or does a fire of longing still urge you to explore?"
    },
    "personalityPortrait": {
      "vi": "Nếu là một người đồng hành, Two of Wands sẽ cùng bạn nhìn ra thế giới rộng lớn. Họ giúp bạn vạch ra tầm nhìn xa và khuyến khích bạn bước ra khỏi ranh giới quen thuộc.",
      "en": "If it were a companion, Two of Wands would look out at the vast world with you. They help you outline a long-term vision and encourage you to step outside your familiar boundaries."
    }
  },
  "minor-wands-three": {
    "intro": {
      "vi": "Three of Wands mang năng lượng của sự mở rộng và những dự định đang thành hình. Lá bài gợi nhắc rằng những nỗ lực bạn gieo xuống đang bắt đầu kết nối với dòng chảy lớn hơn, đòi hỏi sự kiên nhẫn để đón nhận.",
      "en": "Three of Wands carries the energy of expansion and plans taking shape. The card suggests that the efforts you planted are connecting with a larger current, requiring patience to receive."
    },
    "personalityPortrait": {
      "vi": "Như một người hoa tiêu đầy kinh nghiệm, Three of Wands nhắc bạn đừng vội vàng gặt hái ngay lập tức. Họ khuyên bạn giữ vững nhịp độ và tin tưởng vào hạt giống mình đã gieo.",
      "en": "Like an experienced navigator, Three of Wands reminds you not to rush the harvest. They advise you to keep your pace steady and trust the seeds you have sown."
    }
  },
  "minor-wands-four": {
    "intro": {
      "vi": "Four of Wands mang năng lượng của sự ăn mừng và trân trọng những chặng dừng chân. Lá bài là một cái ôm ấm áp, nhắc bạn rằng không cần đợi đến đích cuối cùng mới được phép tận hưởng niềm vui.",
      "en": "Four of Wands carries the energy of celebration and cherishing resting places. The card is a warm embrace, reminding you that you need not wait until the final destination to enjoy joy."
    },
    "personalityPortrait": {
      "vi": "Giống như một buổi tụ họp bình yên bên lửa trại, Four of Wands mời bạn thả lỏng. Họ sẽ cùng bạn nâng ly vì những thành quả nhỏ bé nhất mà bạn đã dũng cảm đạt được.",
      "en": "Like a peaceful gathering around a campfire, Four of Wands invites you to relax. They will raise a glass with you to celebrate even the smallest milestones you bravely achieved."
    }
  },
  "minor-wands-five": {
    "intro": {
      "vi": "Five of Wands mang năng lượng của sự va chạm và những tiếng ồn xung quanh. Lá bài không phải là dấu hiệu của sự sụp đổ, mà là ma sát cần thiết để mài giũa lại quan điểm và tìm ra tiếng nói thật của mình.",
      "en": "Five of Wands carries the energy of friction and surrounding noise. The card is not a sign of collapse, but the necessary friction to sharpen perspectives and find your true voice."
    },
    "personalityPortrait": {
      "vi": "Nếu là một người huấn luyện, Five of Wands sẽ đưa bạn vào những thử thách nhỏ. Họ nhắc bạn đừng trốn tránh những khác biệt, mà hãy dùng nó để rèn luyện sự linh hoạt.",
      "en": "If it were a coach, Five of Wands would put you through small challenges. They remind you not to shy away from differences, but to use them to train your flexibility."
    }
  },
  "minor-wands-six": {
    "intro": {
      "vi": "Six of Wands mang năng lượng của sự công nhận và khoảnh khắc tỏa sáng. Lá bài vỗ vai bạn sau một đoạn đường nỗ lực, xác nhận rằng những gì bạn cống hiến đang được ánh sáng chiếu rọi và trân trọng.",
      "en": "Six of Wands carries the energy of recognition and a moment to shine. The card pats your back after a hard journey, confirming that your dedication is being illuminated and appreciated."
    },
    "personalityPortrait": {
      "vi": "Như một người cổ vũ chân thành, Six of Wands mời bạn ngẩng cao đầu. Họ khuyên bạn hãy cho phép mình được tự hào về bản thân mà không sợ hãi ánh nhìn phán xét.",
      "en": "Like a genuine cheerleader, Six of Wands invites you to hold your head high. They advise you to allow yourself to be proud without fearing judgmental eyes."
    }
  },
  "minor-wands-seven": {
    "intro": {
      "vi": "Seven of Wands mang năng lượng của sự phòng thủ và giữ vững ranh giới. Khi áp lực ập đến, lá bài nhắc bạn nhớ lại lý do vì sao bạn bắt đầu và ngọn lửa nào bạn đang muốn bảo vệ.",
      "en": "Seven of Wands carries the energy of defense and holding boundaries. When pressure arises, the card reminds you why you started and which fire you are trying to protect."
    },
    "personalityPortrait": {
      "vi": "Nếu là một người bảo vệ, Seven of Wands trao cho bạn lòng can đảm. Họ không khuyến khích bạn gây hấn, mà chỉ giúp bạn nói 'không' một cách kiên định với những gì xâm phạm giá trị của bạn.",
      "en": "If it were a guardian, Seven of Wands grants you courage. They don't encourage aggression, but simply help you say 'no' firmly to anything that compromises your values."
    }
  },
  "minor-wands-eight": {
    "intro": {
      "vi": "Eight of Wands mang năng lượng của tốc độ và những thông điệp đang bay tới. Lá bài là ngọn gió đẩy bạn về phía trước, báo hiệu một sự trì trệ đã kết thúc và mọi thứ đang vào guồng.",
      "en": "Eight of Wands carries the energy of speed and incoming messages. The card is the wind pushing you forward, signaling that stagnation has ended and things are in motion."
    },
    "personalityPortrait": {
      "vi": "Như một người truyền tin hối hả, Eight of Wands khuyên bạn đừng chần chừ nữa. Họ nhắc bạn bắt nhịp với dòng chảy và tận dụng khoảnh khắc khi năng lượng đang ở mức cao nhất.",
      "en": "Like a hurried messenger, Eight of Wands advises you not to hesitate any longer. They remind you to catch the flow and utilize the moment when energy is at its peak."
    }
  },
  "minor-wands-nine": {
    "intro": {
      "vi": "Nine of Wands mang năng lượng của sự kiên cường sau nhiều vết xước. Lá bài thấu hiểu sự mệt mỏi của bạn, nhưng cũng nhẹ nhàng chỉ ra rằng bạn đã đi gần đến vạch đích hơn bạn tưởng.",
      "en": "Nine of Wands carries the energy of resilience after many scratches. The card understands your weariness, but gently points out that you are closer to the finish line than you think."
    },
    "personalityPortrait": {
      "vi": "Giống như một người bạn đồng hành từng trải, Nine of Wands ngồi xuống cạnh bạn khi bạn muốn bỏ cuộc. Họ xoa dịu những vết thương và thì thầm: 'Chỉ một chút nữa thôi, bạn đã làm rất tốt rồi.'",
      "en": "Like a seasoned companion, Nine of Wands sits beside you when you want to give up. They soothe your wounds and whisper: 'Just a little further, you have done so well.'"
    }
  },
  "minor-wands-ten": {
    "intro": {
      "vi": "Ten of Wands mang năng lượng của sự hoàn tất đi kèm với sức nặng. Lá bài phản chiếu một đôi vai đang gồng gánh quá nhiều trách nhiệm, nhắc bạn tự hỏi xem ngọn lửa nào thực sự thuộc về mình.",
      "en": "Ten of Wands carries the energy of completion accompanied by heavy weight. The card reflects shoulders bearing too many responsibilities, prompting you to ask which fires truly belong to you."
    },
    "personalityPortrait": {
      "vi": "Nếu là một người thầy, Ten of Wands sẽ từ tốn nhắc bạn đặt bớt đồ đạc xuống. Họ giúp bạn nhận ra ranh giới giữa việc nỗ lực hết mình và việc tự vắt kiệt sức lực không cần thiết.",
      "en": "If it were a teacher, Ten of Wands would gently tell you to put some baggage down. They help you recognize the boundary between trying your best and unnecessarily exhausting yourself."
    }
  },
  "minor-wands-page": {
    "intro": {
      "vi": "Page of Wands mang năng lượng của sự tò mò và khao khát khám phá nguyên sơ. Lá bài là ánh mắt háo hức trước một ý tưởng mới mẻ, đánh thức đứa trẻ sáng tạo bên trong bạn mà không màng kết quả.",
      "en": "Page of Wands carries the energy of curiosity and pristine desire to explore. The card is an eager gaze at a fresh idea, awakening your inner creative child regardless of the outcome."
    },
    "personalityPortrait": {
      "vi": "Như một người bạn trẻ tuổi đầy đam mê, Page of Wands rủ rê bạn thử nghiệm điều gì đó khác biệt. Họ khuyên bạn hãy bắt đầu bằng niềm vui thay vì những tính toán khô khan.",
      "en": "Like a passionate young friend, Page of Wands invites you to experiment with something different. They advise you to start with joy rather than dry calculations."
    }
  },
  "minor-wands-knight": {
    "intro": {
      "vi": "Knight of Wands mang năng lượng của sự tiến lên mãnh liệt và những cuộc phiêu lưu. Lá bài thôi thúc bạn hành động theo tiếng gọi của đam mê, mang theo sự tự tin và lòng nhiệt thành rực cháy.",
      "en": "Knight of Wands carries the energy of fierce forward motion and adventure. The card urges you to act on the call of passion, bringing confidence and burning enthusiasm."
    },
    "personalityPortrait": {
      "vi": "Nếu là một người đồng hành, Knight of Wands sẽ nắm tay bạn chạy về phía trước. Họ truyền lửa cho bạn, nhưng cũng nhắc nhở bạn thi thoảng hãy nhìn lại để không đánh mất phương hướng.",
      "en": "If it were a companion, Knight of Wands would take your hand and run forward. They ignite your fire, but also remind you to look back occasionally so as not to lose your direction."
    }
  },
  "minor-wands-queen": {
    "intro": {
      "vi": "Queen of Wands mang năng lượng của sự tự tin rạng rỡ và sức hút tự nhiên. Lá bài là minh chứng cho việc bạn hoàn toàn có thể vừa mạnh mẽ bảo vệ ranh giới của mình, vừa tỏa ra sự ấm áp bao dung.",
      "en": "Queen of Wands carries the energy of radiant confidence and natural magnetism. The card is proof that you can fiercely protect your boundaries while radiating inclusive warmth."
    },
    "personalityPortrait": {
      "vi": "Giống như một nữ hoàng làm chủ ngọn lửa của riêng mình, Queen of Wands mời bạn yêu lấy bản thân một cách không e dè. Họ khuyến khích bạn lan tỏa ánh sáng bên trong mà không cần xin phép ai.",
      "en": "Like a queen mastering her own fire, Queen of Wands invites you to love yourself unapologetically. She encourages you to spread your inner light without asking for permission."
    }
  },
  "minor-wands-king": {
    "intro": {
      "vi": "King of Wands mang năng lượng của tầm nhìn lớn và khả năng kiến tạo vĩ mô. Lá bài đại diện cho nghệ thuật biến những ý tưởng hoang dại thành một cấu trúc bền vững và có sức lan tỏa.",
      "en": "King of Wands carries the energy of grand vision and macro-creation. The card represents the art of turning wild ideas into a sustainable and influential structure."
    },
    "personalityPortrait": {
      "vi": "Nếu là một người dẫn dắt, King of Wands trao cho bạn cảm giác tin cậy tuyệt đối. Họ truyền cảm hứng để bạn đứng lên làm chủ không gian của mình và biến khát vọng thành hiện thực rõ ràng.",
      "en": "As a guide, King of Wands gives you a sense of absolute reliability. He inspires you to stand up, master your space, and turn your aspirations into clear reality."
    }
  }
};

const filePath = 'd:/nilaza/packages/content/data/tarot-cards.json';
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

let updatedCount = 0;
data.forEach(card => {
  if (updates[card.id]) {
    card.intro = updates[card.id].intro;
    card.personalityPortrait = updates[card.id].personalityPortrait;
    updatedCount++;
  }
  
  // Fix specific typos mentioned in PRD
  if (card.keywords && card.keywords.vi) {
    card.keywords.vi = card.keywords.vi.map(kw => kw.replace('thứ hoạch', 'thu hoạch').replace('mà sát', 'ma sát').replace('điểm càng', 'điểm căng'));
  }
  
  if (card.intro && card.intro.vi) {
    card.intro.vi = card.intro.vi.replace('quả tái', 'quá tải').replace('nói nào', 'nơi nào');
  }
  if (card.uprightMeaning && card.uprightMeaning.vi) {
    card.uprightMeaning.vi = card.uprightMeaning.vi.replace('quả tái', 'quá tải').replace('nói nào', 'nơi nào');
  }
  if (card.reversedMeaning && card.reversedMeaning.vi) {
    card.reversedMeaning.vi = card.reversedMeaning.vi.replace('quả tái', 'quá tải').replace('nói nào', 'nơi nào');
  }
  if (card.reflectionQuestion && card.reflectionQuestion.vi) {
    card.reflectionQuestion.vi = card.reflectionQuestion.vi.replace('quả tái', 'quá tải').replace('nói nào', 'nơi nào');
  }
});

fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
console.log(`Successfully updated ${updatedCount} Wands cards and fixed keyword typos.`);
