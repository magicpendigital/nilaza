const fs = require('fs');

const updates = {
  "major-05-hierophant": {
    "intro": {
      "vi": "The Hierophant mang năng lượng của những giá trị và niềm tin cốt lõi. Lá bài là một lời mời để bạn nhìn lại những quy tắc mình đang theo đuổi và tự hỏi liệu chúng có còn phù hợp với con người hiện tại của bạn không.",
      "en": "The Hierophant carries the energy of core values and beliefs. The card is an invitation to look at the rules you follow and ask if they still align with who you are today."
    },
    "personalityPortrait": {
      "vi": "Như một người thầy kiên nhẫn, The Hierophant tôn trọng truyền thống nhưng không áp đặt. Họ sẽ ngồi xuống cùng bạn để rà soát lại những bài học cũ và giữ lại những gì thực sự có giá trị.",
      "en": "Like a patient mentor, The Hierophant respects tradition without imposing it. They will sit with you to review old lessons and keep only what is truly valuable."
    }
  },
  "major-06-lovers": {
    "intro": {
      "vi": "The Lovers mang năng lượng của sự kết nối chân thật và những quyết định từ trái tim. Lá bài nhắc bạn rằng mọi sự lựa chọn quan trọng đều bắt đầu từ việc thấu hiểu những giá trị sâu sắc nhất của chính mình.",
      "en": "The Lovers carries the energy of true connection and heart-led decisions. The card reminds you that every important choice begins with understanding your deepest values."
    },
    "personalityPortrait": {
      "vi": "Nếu là một người bạn, The Lovers sẽ không phán xét tình cảm của bạn. Họ sẽ nhẹ nhàng khuyến khích bạn chọn một con đường giúp bạn được sống đúng với bản thân mình nhất.",
      "en": "If it were a friend, The Lovers would not judge your feelings. They would gently encourage you to choose a path that allows you to be your most authentic self."
    }
  },
  "major-07-chariot": {
    "intro": {
      "vi": "The Chariot mang năng lượng của sự tập trung và ý chí vững vàng. Lá bài không hối thúc bạn phải chạy nhanh, mà khơi gợi sự kiên định để bạn giữ vững tay lái trên con đường đã chọn.",
      "en": "The Chariot carries the energy of focus and steady will. The card does not rush you to run faster; it inspires the determination to hold the reins steady on your chosen path."
    },
    "personalityPortrait": {
      "vi": "Như một người đồng hành đầy nhiệt huyết, The Chariot tiếp thêm sức mạnh cho những dự định còn dang dở. Họ nhắc bạn rằng sự kết hợp giữa lý trí và cảm xúc sẽ đưa bạn đi xa.",
      "en": "Like a passionate companion, The Chariot fuels your unfinished plans. They remind you that the alignment of mind and emotion will take you far."
    }
  },
  "major-08-strength": {
    "intro": {
      "vi": "Strength mang năng lượng của sức mạnh nội tâm mềm mại nhưng bền bỉ. Lá bài là lời nhắc nhở rằng lòng can đảm thực sự không đến từ việc trấn áp, mà từ sự thấu hiểu và bao dung với chính những góc tối của mình.",
      "en": "Strength carries the energy of soft yet resilient inner power. The card is a reminder that true courage comes not from suppression, but from understanding and embracing your own shadows."
    },
    "personalityPortrait": {
      "vi": "Giống như một bàn tay êm ái xoa dịu những căng thẳng, Strength sẽ không đòi hỏi bạn phải gồng mình. Họ sẽ khuyên bạn dùng sự từ bi để xoa dịu những phần đang tổn thương hay giận dữ bên trong.",
      "en": "Like a gentle hand soothing tension, Strength will not ask you to brace yourself. They will advise you to use compassion to calm the wounded or angry parts within."
    }
  },
  "major-09-hermit": {
    "intro": {
      "vi": "The Hermit mang năng lượng của sự tĩnh lặng và hành trình quay vào bên trong. Lá bài vỗ về bạn rằng đôi khi, việc lùi lại khỏi đám đông là cách tốt nhất để tìm thấy ánh sáng dẫn đường riêng.",
      "en": "The Hermit carries the energy of stillness and the inward journey. The card reassures you that sometimes stepping back from the crowd is the best way to find your own guiding light."
    },
    "personalityPortrait": {
      "vi": "Như một người dẫn đường thầm lặng, The Hermit giương cao ngọn đèn sưởi ấm tâm hồn bạn. Họ sẽ cùng bạn đi qua bóng tối, chỉ để lắng nghe những tiếng nói chân thật nhất đang chờ được khám phá.",
      "en": "Like a quiet guide, The Hermit holds up a lantern to warm your soul. They will walk with you through the dark, simply to listen to the most honest voices waiting to be heard."
    }
  },
  "major-10-wheel": {
    "intro": {
      "vi": "Wheel of Fortune mang năng lượng của những chuyển động không ngừng trong cuộc sống. Lá bài giúp bạn nhìn nhận mọi thăng trầm như một phần của chu kỳ tự nhiên, nơi mỗi thay đổi đều mở ra không gian mới.",
      "en": "Wheel of Fortune carries the energy of life's constant motion. The card helps you see all ups and downs as part of a natural cycle, where every shift opens up new space."
    },
    "personalityPortrait": {
      "vi": "Giống như một người quan sát thông thái, Wheel of Fortune nhắc nhở bạn không cần bám víu vào hiện tại. Họ sẽ mời bạn thả lỏng và tin tưởng vào nhịp điệu của thời gian.",
      "en": "Like a wise observer, Wheel of Fortune reminds you not to cling to the present. They will invite you to relax and trust the rhythm of time."
    }
  },
  "major-11-justice": {
    "intro": {
      "vi": "Justice mang năng lượng của sự minh bạch và trách nhiệm cá nhân. Lá bài không dùng để phán xét đúng sai, mà là một tấm gương trong suốt để bạn nhìn nhận rõ ràng nguyên nhân và kết quả.",
      "en": "Justice carries the energy of clarity and personal responsibility. The card is not meant to judge right from wrong, but acts as a clear mirror to help you see cause and effect."
    },
    "personalityPortrait": {
      "vi": "Nếu là một người bạn, Justice sẽ rất thẳng thắn và công bằng. Họ sẽ giúp bạn cân nhắc kỹ lưỡng mọi khía cạnh và khuyến khích bạn đưa ra quyết định mà lòng bạn thấy bình yên nhất.",
      "en": "If it were a friend, Justice would be highly direct and fair. They would help you weigh all sides carefully and encourage you to make the decision that brings your heart the most peace."
    }
  },
  "major-12-hanged-man": {
    "intro": {
      "vi": "The Hanged Man mang năng lượng của sự tạm dừng tự nguyện để nhìn đời qua một lăng kính khác. Lá bài nhắc bạn rằng đôi khi, không làm gì cả lại là hành động sáng suốt nhất.",
      "en": "The Hanged Man carries the energy of voluntary pause to see the world through a different lens. The card reminds you that sometimes, doing nothing is the wisest action."
    },
    "personalityPortrait": {
      "vi": "Như một người thầy của sự buông lỏng, The Hanged Man mời bạn ngừng tranh đấu với hoàn cảnh. Họ sẽ chỉ cho bạn thấy vẻ đẹp của việc trút bỏ kỳ vọng và đón nhận những góc nhìn mới mẻ.",
      "en": "As a teacher of release, The Hanged Man invites you to stop fighting your circumstances. They will show you the beauty of shedding expectations and embracing fresh perspectives."
    }
  },
  "major-13-death": {
    "intro": {
      "vi": "Death mang năng lượng của sự dọn dẹp và làm mới. Lá bài không tượng trưng cho sự kết thúc tàn khốc, mà là một lời hứa rằng khi những điều cũ kỹ qua đi, không gian mới sẽ được lấp đầy bởi sự sống tươi mới.",
      "en": "Death carries the energy of clearing and renewal. The card does not symbolize a cruel end, but a promise that when the old falls away, new space is filled with fresh life."
    },
    "personalityPortrait": {
      "vi": "Như một người bạn trung thành, Death sẽ nhẹ nhàng cầm tay bạn bước qua những cuộc chia ly cần thiết. Họ giúp bạn gạt đi lớp áo cũ để tâm hồn được hít thở tự do hơn.",
      "en": "Like a loyal friend, Death will gently hold your hand through necessary partings. They help you shed old layers so your soul can breathe more freely."
    }
  },
  "major-14-temperance": {
    "intro": {
      "vi": "Temperance mang năng lượng của sự hòa quyện và chữa lành. Lá bài khuyên bạn tìm kiếm điểm giao thoa êm dịu giữa những thái cực, nơi mà sự tĩnh lặng và hành động có thể cùng tồn tại.",
      "en": "Temperance carries the energy of blending and healing. The card advises you to seek a gentle intersection between extremes, where stillness and action can coexist."
    },
    "personalityPortrait": {
      "vi": "Giống như một người xoa dịu những vết thương, Temperance mang đến cảm giác thanh bình và nhẫn nại. Họ nhắc nhở bạn rằng sự phục hồi là một nghệ thuật cần thời gian và sự dịu dàng.",
      "en": "Like a soother of wounds, Temperance brings a sense of peace and patience. They remind you that recovery is an art that takes time and gentleness."
    }
  },
  "major-15-devil": {
    "intro": {
      "vi": "The Devil mang năng lượng của những ranh giới bị làm mờ bởi thói quen và sự bám víu. Lá bài là một tấm gương soi chiếu những sợi dây vô hình đang trói buộc bạn, mời gọi bạn nhận diện chúng để tìm lại sự tự chủ.",
      "en": "The Devil carries the energy of boundaries blurred by habit and attachment. The card is a mirror reflecting the invisible threads tying you down, inviting you to recognize them to regain autonomy."
    },
    "personalityPortrait": {
      "vi": "Nếu là một người đồng hành, The Devil không phán xét những yếu đuối của bạn. Họ sẽ khuyến khích bạn thẳng thắn đối diện với những góc khuất bên trong để bạn tự tay tháo gỡ sự trói buộc.",
      "en": "If it were a companion, The Devil would not judge your weaknesses. They would encourage you to face your inner shadows directly so you can untie your own binds."
    }
  },
  "major-17-star": {
    "intro": {
      "vi": "The Star mang năng lượng của sự xoa dịu và ánh sáng dẫn đường sau cơn bão. Lá bài là dòng nước mát lành tưới tẩm lên những mệt mỏi, thắp lại niềm tin vào những điều tốt đẹp đang chờ đợi.",
      "en": "The Star carries the energy of soothing and the guiding light after a storm. The card is a refreshing stream over your weariness, rekindling faith in the good things waiting."
    },
    "personalityPortrait": {
      "vi": "Như một vì sao êm ái trên bầu trời đêm, The Star mang đến hy vọng thuần khiết. Họ sẽ khẽ vỗ về và giúp bạn tìm lại sự bình yên, khuyến khích bạn tự chăm sóc tâm hồn mình.",
      "en": "Like a gentle star in the night sky, The Star brings pure hope. They will softly comfort you and help you find peace, encouraging you to nourish your own soul."
    }
  },
  "major-18-moon": {
    "intro": {
      "vi": "The Moon mang năng lượng của cõi vô thức, nơi những giấc mơ và nỗi sợ hãi đan xen. Lá bài mời bạn bước chậm lại trong màn đêm mờ ảo, học cách cảm nhận thay vì cố gắng tìm kiếm sự rõ ràng tuyệt đối.",
      "en": "The Moon carries the energy of the unconscious, where dreams and fears intertwine. The card invites you to walk slowly in the twilight, learning to feel rather than seeking absolute clarity."
    },
    "personalityPortrait": {
      "vi": "Giống như một người kể chuyện bí ẩn, The Moon sẽ dìu dắt bạn qua những cảm xúc khó gọi tên. Họ nhắc bạn rằng bóng tối không đáng sợ, mà là nơi cất giữ những trực giác sâu sắc nhất.",
      "en": "Like a mysterious storyteller, The Moon will guide you through unnamed emotions. They remind you that the dark is not something to fear, but the keeper of your deepest intuitions."
    }
  },
  "major-19-sun": {
    "intro": {
      "vi": "The Sun mang năng lượng của sự hân hoan, rạng rỡ và sự thật rọi sáng. Lá bài là tia nắng ấm áp đánh thức mọi tiềm năng, xác nhận rằng bạn đang đi đúng hướng để đón nhận niềm vui thuần khiết.",
      "en": "The Sun carries the energy of joy, radiance, and illuminating truth. The card is a warm ray waking up your potential, affirming you are on the right path to receive pure joy."
    },
    "personalityPortrait": {
      "vi": "Như một người bạn luôn tràn đầy năng lượng, The Sun sẽ cười lớn và ăn mừng cùng bạn. Họ khuyến khích bạn tỏa sáng không ngần ngại và tận hưởng sự sống một cách trọn vẹn.",
      "en": "Like a friend overflowing with energy, The Sun will laugh loud and celebrate with you. They encourage you to shine without hesitation and enjoy life to the fullest."
    }
  },
  "major-20-judgement": {
    "intro": {
      "vi": "Judgement mang năng lượng của sự thức tỉnh và những lời kêu gọi từ sâu thẳm. Lá bài đánh dấu một khoảnh khắc bạn nhìn rõ bức tranh toàn cảnh, tha thứ cho quá khứ và sẵn sàng nâng cấp bản thân.",
      "en": "Judgement carries the energy of awakening and a deep inner calling. The card marks a moment of seeing the big picture, forgiving the past, and being ready to elevate yourself."
    },
    "personalityPortrait": {
      "vi": "Nếu là một người dẫn dắt, Judgement sẽ thổi một hồi còi rõ ràng và trong trẻo. Họ mời bạn gỡ bỏ những gánh nặng tự trách để bước lên một phiên bản tự do và nhẹ nhàng hơn.",
      "en": "As a guide, Judgement would blow a clear, resonant horn. They invite you to drop the burdens of self-blame and step into a freer, lighter version of yourself."
    }
  },
  "major-21-world": {
    "intro": {
      "vi": "The World mang năng lượng của sự hoàn tất và cảm giác trọn vẹn. Lá bài là vòng nguyệt quế tôn vinh một hành trình dài đã khép lại đẹp đẽ, chuẩn bị không gian cho những khám phá mới mẻ ở tầng mức cao hơn.",
      "en": "The World carries the energy of completion and wholeness. The card is a laurel wreath honoring a long journey beautifully closed, preparing space for new discoveries on a higher level."
    },
    "personalityPortrait": {
      "vi": "Giống như một người đồng hành đã đi cùng bạn đến tận cùng thế giới, The World mỉm cười đầy tự hào. Họ nhắc bạn hãy dừng lại một nhịp để ghi nhận mọi nỗ lực và ăn mừng sự trưởng thành của chính mình.",
      "en": "Like a companion who has walked with you to the edge of the world, The World smiles with pride. They remind you to pause, acknowledge your efforts, and celebrate your growth."
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
});

fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
console.log(`Successfully updated ${updatedCount} Major Arcana cards.`);
