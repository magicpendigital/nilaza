const fs = require('fs');

const updates = {
  // PENTACLES
  "minor-pentacles-ace": {
    "intro": {
      "vi": "Ace of Pentacles mang năng lượng của một hạt giống trù phú được gieo vào lòng đất màu mỡ. Lá bài là một cơ hội hữu hình để bạn bắt đầu xây dựng sự ổn định cho sức khỏe, tài chính hoặc công việc.",
      "en": "Ace of Pentacles carries the energy of a prosperous seed planted in fertile soil. The card is a tangible opportunity for you to begin building stability for your health, finances, or work."
    },
    "personalityPortrait": {
      "vi": "Như một món quà bất ngờ, Ace of Pentacles mang đến cảm giác vững chãi và an toàn. Họ mời bạn chạm tay vào thực tại, dùng những nguồn lực đang có để tạo ra điều gì đó lâu bền.",
      "en": "Like an unexpected gift, Ace of Pentacles brings a sense of solidity and safety. They invite you to touch reality, using the resources you have to create something lasting."
    }
  },
  "minor-pentacles-two": {
    "intro": {
      "vi": "Two of Pentacles mang năng lượng của sự tung hứng và nhịp điệu uyển chuyển. Lá bài nhắc bạn rằng việc duy trì cân bằng không phải là đứng yên, mà là học cách linh hoạt nương theo những thay đổi liên tục.",
      "en": "Two of Pentacles carries the energy of juggling and a graceful rhythm. The card reminds you that maintaining balance is not standing still, but learning to flexibly flow with constant changes."
    },
    "personalityPortrait": {
      "vi": "Nếu là một người bạn, Two of Pentacles sẽ nhắc bạn đừng quá căng thẳng khi phải xoay xở. Họ khuyến khích bạn xem cuộc sống như một điệu nhảy, nơi bạn có thể làm nhiều việc nhưng vẫn giữ được sự nhẹ nhàng.",
      "en": "If it were a friend, Two of Pentacles would remind you not to stress too much while managing things. They encourage you to view life as a dance, where you can do many things yet maintain a sense of lightness."
    }
  },
  "minor-pentacles-three": {
    "intro": {
      "vi": "Three of Pentacles mang năng lượng của sự cộng tác và tay nghề thủ công. Lá bài tôn vinh giá trị của việc làm việc nhóm, nơi mỗi người đóng góp một chuyên môn riêng để xây dựng nên một nền tảng vững chắc.",
      "en": "Three of Pentacles carries the energy of collaboration and craftsmanship. The card honors the value of teamwork, where everyone contributes a unique expertise to build a solid foundation."
    },
    "personalityPortrait": {
      "vi": "Giống như một kiến trúc sư tận tâm, Three of Pentacles ghi nhận sự nỗ lực của bạn. Họ mời bạn mở lòng học hỏi từ người khác và hiểu rằng những công trình lớn không bao giờ được xây bởi một người.",
      "en": "Like a dedicated architect, Three of Pentacles acknowledges your effort. They invite you to open your mind to learn from others and understand that great structures are never built by one person alone."
    }
  },
  "minor-pentacles-four": {
    "intro": {
      "vi": "Four of Pentacles mang năng lượng của sự tích lũy và mong muốn bảo vệ những gì mình có. Lá bài là một cái ôm siết chặt để tìm kiếm sự an toàn, nhưng đôi khi lại vô tình tạo ra rào cản ngăn cản dòng chảy mới.",
      "en": "Four of Pentacles carries the energy of accumulation and the desire to protect what you have. The card is a tight embrace seeking safety, but sometimes inadvertently creates a barrier preventing new flow."
    },
    "personalityPortrait": {
      "vi": "Như một người giữ cửa thận trọng, Four of Pentacles hiểu được nỗi sợ thiếu thốn của bạn. Tuy nhiên, họ nhẹ nhàng khuyên bạn hãy nới lỏng tay ra một chút để thấy rằng sẻ chia không làm bạn mất đi giá trị.",
      "en": "Like a cautious gatekeeper, Four of Pentacles understands your fear of scarcity. However, they gently advise you to loosen your grip a bit to see that sharing does not diminish your worth."
    }
  },
  "minor-pentacles-five": {
    "intro": {
      "vi": "Five of Pentacles mang năng lượng của sự mệt mỏi và cảm giác bị bỏ rơi giữa giá lạnh. Lá bài phản chiếu một khoảng thời gian khó khăn, nhưng cũng là lời nhắc nhở rằng ánh sáng và sự giúp đỡ luôn ở ngay gần, nếu bạn chịu ngước nhìn.",
      "en": "Five of Pentacles carries the energy of weariness and feeling abandoned in the cold. The card reflects a difficult time, but is also a reminder that light and help are always nearby, if you are willing to look up."
    },
    "personalityPortrait": {
      "vi": "Nếu là một người đồng hành trong tuyết, Five of Pentacles sẽ không vội an ủi bạn bằng những hứa hẹn viển vông. Họ sẽ khoác cho bạn một chiếc áo ấm và chỉ về phía ánh đèn, mời bạn bước qua mặc cảm để nhận lấy sự nâng đỡ.",
      "en": "If it were a companion in the snow, Five of Pentacles would not rush to comfort you with empty promises. They would drape a warm coat over you and point to the lighted window, inviting you to step past pride to receive support."
    }
  },
  "minor-pentacles-six": {
    "intro": {
      "vi": "Six of Pentacles mang năng lượng của dòng chảy cho và nhận. Lá bài là cán cân của lòng hào phóng, nhắc bạn về vẻ đẹp của việc hỗ trợ người khác khi dư dả và biết cách đón nhận khi thiếu thốn.",
      "en": "Six of Pentacles carries the energy of the flow of giving and receiving. The card is the scale of generosity, reminding you of the beauty of supporting others when abundant and knowing how to receive when in need."
    },
    "personalityPortrait": {
      "vi": "Giống như một nhà hảo tâm tĩnh lặng, Six of Pentacles luôn sẵn sàng trao đi mà không phán xét. Họ khuyên bạn duy trì sự tuần hoàn của lòng tốt, bởi mọi thứ bạn cho đi rồi sẽ quay trở lại để nuôi dưỡng bạn.",
      "en": "Like a quiet philanthropist, Six of Pentacles is always ready to give without judgment. They advise you to maintain the cycle of kindness, because everything you give will eventually return to nourish you."
    }
  },
  "minor-pentacles-seven": {
    "intro": {
      "vi": "Seven of Pentacles mang năng lượng của sự chờ đợi kiên nhẫn. Lá bài đánh dấu khoảnh khắc bạn dừng lại, dựa vào chiếc cuốc và ngắm nhìn những hạt giống mình đã dày công vun xới đang dần đâm chồi.",
      "en": "Seven of Pentacles carries the energy of patient waiting. The card marks the moment you pause, lean on your hoe, and gaze at the seeds you have diligently cultivated as they slowly sprout."
    },
    "personalityPortrait": {
      "vi": "Như một người nông dân lành nghề, Seven of Pentacles khuyên bạn đừng vội vàng bứt nụ. Họ mời bạn tận hưởng sự bình yên của việc nỗ lực hết sức mình và tin tưởng vào nhịp điệu phát triển tự nhiên.",
      "en": "Like a skilled farmer, Seven of Pentacles advises you not to pull the buds in haste. They invite you to enjoy the peace of doing your best and trusting the natural rhythm of growth."
    }
  },
  "minor-pentacles-eight": {
    "intro": {
      "vi": "Eight of Pentacles mang năng lượng của sự miệt mài và rèn giũa kỹ năng. Lá bài là một không gian tập trung tĩnh lặng, nơi bạn lặp đi lặp lại một công việc với sự tận tâm để đạt đến độ tinh xảo cao nhất.",
      "en": "Eight of Pentacles carries the energy of diligence and honing skills. The card is a quiet space of focus, where you repeatedly perform a task with dedication to reach the highest level of mastery."
    },
    "personalityPortrait": {
      "vi": "Nếu là một người thợ thủ công, Eight of Pentacles sẽ khen ngợi sự kiên trì của bạn. Họ nhắc nhở bạn rằng thành quả lớn lao luôn được tạo nên từ những chi tiết nhỏ bé được chăm chút mỗi ngày.",
      "en": "If it were a craftsman, Eight of Pentacles would praise your persistence. They remind you that great achievements are always made of small details nurtured every day."
    }
  },
  "minor-pentacles-nine": {
    "intro": {
      "vi": "Nine of Pentacles mang năng lượng của sự tự chủ và vẻ đẹp của sự mãn nguyện cá nhân. Lá bài là một khu vườn phong phú do chính tay bạn tạo nên, nơi bạn có quyền thư giãn và tự hào về sự độc lập của mình.",
      "en": "Nine of Pentacles carries the energy of self-sufficiency and the beauty of personal contentment. The card is a lush garden created by your own hands, where you have the right to relax and take pride in your independence."
    },
    "personalityPortrait": {
      "vi": "Giống như một người tận hưởng cuộc sống, Nine of Pentacles mời bạn dạo bước trong chính thành tựu của mình. Họ nhắc bạn rằng bạn không cần ai khác để hoàn thiện bản thân, bởi bạn đã đủ đầy từ bên trong.",
      "en": "Like someone savoring life, Nine of Pentacles invites you to stroll through your own achievements. They remind you that you need no one else to complete you, for you are already whole from within."
    }
  },
  "minor-pentacles-ten": {
    "intro": {
      "vi": "Ten of Pentacles mang năng lượng của sự vững chãi bền lâu và di sản truyền lại. Lá bài là bức tranh toàn cảnh về một nền móng gia đình hoặc sự nghiệp được xây đắp an toàn, vượt qua bài test của thời gian.",
      "en": "Ten of Pentacles carries the energy of enduring solidity and inherited legacy. The card is a panoramic view of a family or career foundation built safely, standing the test of time."
    },
    "personalityPortrait": {
      "vi": "Như một bậc trưởng bối thông thái, Ten of Pentacles mỉm cười trước sự ấm no của bạn. Họ khuyên bạn hãy nghĩ xa hơn hiện tại, biết trân trọng gốc rễ và chia sẻ sự vững vàng này cho thế hệ sau.",
      "en": "Like a wise elder, Ten of Pentacles smiles upon your prosperity. They advise you to think beyond the present, to cherish your roots and share this stability with the next generation."
    }
  },
  "minor-pentacles-page": {
    "intro": {
      "vi": "Page of Pentacles mang năng lượng của sự tò mò thực tế và khao khát học hỏi vững chắc. Lá bài là ánh mắt chăm chú của một người học việc, cẩn thận đặt viên gạch đầu tiên cho một nền móng mới.",
      "en": "Page of Pentacles carries the energy of practical curiosity and a solid desire to learn. The card is the attentive gaze of an apprentice, carefully laying the first brick for a new foundation."
    },
    "personalityPortrait": {
      "vi": "Nếu là một người bạn trẻ, Page of Pentacles sẽ rủ bạn bắt tay vào việc thay vì chỉ tưởng tượng. Họ khuyến khích bạn học từ những điều cơ bản nhất và đừng ngại đi từng bước nhỏ một.",
      "en": "If it were a young friend, Page of Pentacles would invite you to get hands-on instead of just imagining. They encourage you to learn from the basics and not fear taking one small step at a time."
    }
  },
  "minor-pentacles-knight": {
    "intro": {
      "vi": "Knight of Pentacles mang năng lượng của sự bền bỉ, kiên định và đáng tin cậy. Lá bài không di chuyển nhanh, nhưng mỗi bước đi đều in hằn dấu ấn của sự cam kết và trách nhiệm tuyệt đối.",
      "en": "Knight of Pentacles carries the energy of persistence, steadiness, and reliability. The card does not move fast, but every step leaves the imprint of absolute commitment and responsibility."
    },
    "personalityPortrait": {
      "vi": "Như một người đồng hành trung thành, Knight of Pentacles sẽ gánh vác phần việc nặng nhọc cùng bạn. Họ nhắc nhở bạn rằng những gì xứng đáng có được đều cần thời gian và sự kiên nhẫn không bỏ cuộc.",
      "en": "Like a loyal companion, Knight of Pentacles will shoulder the heavy lifting with you. They remind you that anything worth having requires time and an unyielding patience."
    }
  },
  "minor-pentacles-queen": {
    "intro": {
      "vi": "Queen of Pentacles mang năng lượng của sự trù phú ấm áp và khả năng nuôi dưỡng vạn vật. Lá bài là hiện thân của một không gian an toàn, nơi cả tâm hồn lẫn cơ thể đều được chăm sóc chu đáo.",
      "en": "Queen of Pentacles carries the energy of warm abundance and the ability to nurture all things. The card embodies a safe space where both soul and body are thoughtfully cared for."
    },
    "personalityPortrait": {
      "vi": "Giống như một người mẹ của đất, Queen of Pentacles sẽ nấu cho bạn một bữa ăn ngon. Họ khuyên bạn trước khi muốn cứu thế giới, hãy chắc chắn rằng bạn đã đối xử tốt với chính cơ thể và không gian sống của mình.",
      "en": "Like an earth mother, Queen of Pentacles would cook you a hearty meal. They advise you that before trying to save the world, make sure you have treated your own body and living space well."
    }
  },
  "minor-pentacles-king": {
    "intro": {
      "vi": "King of Pentacles mang năng lượng của sự vững chãi như một ngọn núi và nghệ thuật quản trị tài nguyên. Lá bài đại diện cho việc làm chủ thế giới vật chất để tạo ra sự thịnh vượng không chỉ cho bản thân mà cho cả những người xung quanh.",
      "en": "King of Pentacles carries the energy of mountain-like solidity and the art of resource management. The card represents mastering the material world to create prosperity not just for oneself but for those around."
    },
    "personalityPortrait": {
      "vi": "Nếu là một người dẫn dắt, King of Pentacles sẽ bảo vệ bạn dưới một mái hiên kiên cố. Họ truyền cho bạn cảm giác an tâm vô bờ bến và khuyến khích bạn dùng thực tế để bảo vệ những giá trị cốt lõi.",
      "en": "As a guide, King of Pentacles would protect you under a sturdy roof. They fill you with boundless reassurance and encourage you to use practicality to defend your core values."
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
  
  if (card.keywords && card.keywords.vi) {
    card.keywords.vi = card.keywords.vi.map(kw => kw.replace('từ chủ', 'tự chủ'));
  }
});

fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
console.log(`Successfully updated ${updatedCount} Pentacles cards.`);
