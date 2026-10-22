const fs = require('fs');

const updates = {
  // CUPS
  "minor-cups-ace": {
    "intro": {
      "vi": "Ace of Cups mang năng lượng của chiếc cốc tràn đầy tình yêu và sự rộng mở. Lá bài là một khởi đầu dịu dàng, mời gọi bạn cho phép mình được cảm nhận sâu sắc hơn mà không sợ hãi.",
      "en": "Ace of Cups carries the energy of a cup overflowing with love and openness. The card is a gentle beginning, inviting you to allow yourself to feel more deeply without fear."
    },
    "personalityPortrait": {
      "vi": "Như một người bạn mang đến sự ủi an, Ace of Cups xoa dịu những góc khô cằn trong bạn. Họ khuyên bạn hãy mở lòng đón nhận những hạt giống cảm xúc mới đang nảy mầm.",
      "en": "Like a comforting friend, Ace of Cups soothes the dry corners within you. They advise you to open your heart to the new seeds of emotion that are sprouting."
    }
  },
  "minor-cups-two": {
    "intro": {
      "vi": "Two of Cups mang năng lượng của sự đồng điệu và sự phản chiếu chân thật. Lá bài nhắc bạn rằng những kết nối ý nghĩa nhất luôn đến từ việc hai bên cùng tự nguyện mở lòng và lắng nghe.",
      "en": "Two of Cups carries the energy of harmony and honest reflection. The card reminds you that the most meaningful connections always come from both sides willingly opening up and listening."
    },
    "personalityPortrait": {
      "vi": "Nếu là một người bạn, Two of Cups sẽ trao cho bạn một sự thấu hiểu tĩnh lặng. Họ giúp bạn nhìn thấy vẻ đẹp của mình thông qua lăng kính của một người thực sự trân trọng bạn.",
      "en": "If it were a friend, Two of Cups would offer quiet understanding. They help you see your own beauty through the lens of someone who truly appreciates you."
    }
  },
  "minor-cups-three": {
    "intro": {
      "vi": "Three of Cups mang năng lượng của tình bạn và sự sẻ chia vô tư. Lá bài gợi nhớ về những khoảnh khắc bạn không cần phải gồng mình, chỉ đơn giản là được kết nối và ăn mừng cùng những người cùng tần số.",
      "en": "Three of Cups carries the energy of friendship and selfless sharing. The card recalls moments when you don't have to brace yourself, simply connecting and celebrating with kindred spirits."
    },
    "personalityPortrait": {
      "vi": "Giống như một vòng tròn ấm áp, Three of Cups rủ bạn tạm quên đi những lo toan. Họ nhắc nhở rằng niềm vui thực sự sẽ được nhân lên khi có người cùng nâng ly.",
      "en": "Like a warm circle, Three of Cups invites you to momentarily forget your worries. They remind you that true joy multiplies when there is someone to raise a glass with."
    }
  },
  "minor-cups-four": {
    "intro": {
      "vi": "Four of Cups mang năng lượng của sự hướng nội và những khoảng lặng chưa được lấp đầy. Lá bài không trách cứ sự chán nản của bạn, mà nhẹ nhàng hỏi xem bạn đang thực sự khao khát điều gì khác biệt.",
      "en": "Four of Cups carries the energy of inwardness and unfulfilled quiet spaces. The card doesn't blame your apathy, but gently asks what you are truly longing for."
    },
    "personalityPortrait": {
      "vi": "Như một người bạn kiên nhẫn ngồi cạnh khi bạn dỗi hờn, Four of Cups không vội vàng ép bạn phải vui. Họ chỉ yên lặng chờ đến khi bạn sẵn sàng nhìn thấy những cơ hội đang được chìa ra.",
      "en": "Like a patient friend sitting by when you pout, Four of Cups doesn't rush you to be happy. They quietly wait until you are ready to see the opportunities being offered."
    }
  },
  "minor-cups-five": {
    "intro": {
      "vi": "Five of Cups mang năng lượng của những chiếc cốc đã đổ và nỗi tiếc nuối chưa nguôi. Lá bài cho phép bạn buồn, nhưng cũng thì thầm nhắc bạn về những chiếc cốc vẫn còn nguyên vẹn ở phía sau.",
      "en": "Five of Cups carries the energy of spilled cups and unsoothed regret. The card allows you to grieve, but also whispers of the cups that still remain standing behind you."
    },
    "personalityPortrait": {
      "vi": "Giống như một người ôm lấy bạn trong lúc vỡ mộng, Five of Cups không nói những lời sáo rỗng. Họ cùng bạn đối diện với mất mát để rồi nhẹ nhàng hướng ánh nhìn của bạn về phía hy vọng còn sót lại.",
      "en": "Like someone embracing you during disillusionment, Five of Cups doesn't offer empty platitudes. They face the loss with you, then gently direct your gaze toward remaining hope."
    }
  },
  "minor-cups-six": {
    "intro": {
      "vi": "Six of Cups mang năng lượng của sự hoài niệm và tính trẻ thơ thuần khiết. Lá bài là một chuyến tàu quay về quá khứ, giúp bạn tìm lại những rung động trong trẻo đã từng nuôi dưỡng mình.",
      "en": "Six of Cups carries the energy of nostalgia and pure childlikeness. The card is a train ride to the past, helping you recover the clear vibrations that once nourished you."
    },
    "personalityPortrait": {
      "vi": "Như một người giữ gìn những kỷ niệm đẹp, Six of Cups vỗ về những mỏi mệt hiện tại của bạn bằng sự ngọt ngào xưa cũ. Họ nhắc bạn rằng sự ngây thơ không phải là điểm yếu, mà là một món quà.",
      "en": "Like a keeper of beautiful memories, Six of Cups comforts your current weariness with old sweetness. They remind you that innocence is not a weakness, but a gift."
    }
  },
  "minor-cups-seven": {
    "intro": {
      "vi": "Seven of Cups mang năng lượng của những ảo ảnh và vô vàn lựa chọn rực rỡ. Lá bài nhắc bạn rằng có những thứ trông rất lấp lánh nhưng không thực sự chứa đựng điều tâm hồn bạn cần.",
      "en": "Seven of Cups carries the energy of illusions and a myriad of dazzling choices. The card reminds you that some things look sparkling but do not truly contain what your soul needs."
    },
    "personalityPortrait": {
      "vi": "Nếu là một người quan sát, Seven of Cups khuyên bạn đừng vội đưa tay chạm vào mọi thứ. Họ giúp bạn lọc tiếng ồn để chọn ra một chiếc cốc duy nhất mang lại sự thỏa mãn thực sự.",
      "en": "If it were an observer, Seven of Cups advises you not to reach for everything at once. They help you filter the noise to choose the single cup that brings true fulfillment."
    }
  },
  "minor-cups-eight": {
    "intro": {
      "vi": "Eight of Cups mang năng lượng của việc rời bỏ những điều không còn phù hợp để đi tìm ý nghĩa sâu sắc hơn. Lá bài tôn vinh lòng can đảm của bạn khi dám bước đi, dù những chiếc cốc cũ vẫn còn hấp dẫn.",
      "en": "Eight of Cups carries the energy of leaving behind what no longer fits to seek deeper meaning. The card honors your courage to walk away, even when the old cups are still appealing."
    },
    "personalityPortrait": {
      "vi": "Như một người đồng hành thầm lặng dưới ánh trăng, Eight of Cups không níu kéo bạn. Họ khích lệ bạn tiến về phía ngọn núi xa, nơi có câu trả lời mà trái tim bạn đang khắc khoải tìm kiếm.",
      "en": "Like a quiet companion under the moonlight, Eight of Cups does not hold you back. They encourage you to head toward the distant mountain, where lies the answer your heart aches for."
    }
  },
  "minor-cups-nine": {
    "intro": {
      "vi": "Nine of Cups mang năng lượng của sự tự hào và mãn nguyện nội tâm. Lá bài là một cái mỉm cười rạng rỡ, xác nhận rằng bạn hoàn toàn xứng đáng tận hưởng những điều tốt đẹp đang hiện diện.",
      "en": "Nine of Cups carries the energy of pride and inner contentment. The card is a radiant smile, affirming that you wholly deserve to enjoy the good things present in your life."
    },
    "personalityPortrait": {
      "vi": "Nếu là một người chủ tiệc ấm áp, Nine of Cups mời bạn ngồi vào chiếc ghế danh dự. Họ nhắc nhở bạn rằng việc tự hài lòng và biết ơn chính mình cũng là một cách chữa lành sâu sắc.",
      "en": "If it were a warm host, Nine of Cups invites you to the seat of honor. They remind you that self-satisfaction and gratitude toward yourself is a deep form of healing."
    }
  },
  "minor-cups-ten": {
    "intro": {
      "vi": "Ten of Cups mang năng lượng của sự trọn vẹn và bình yên trong các mối quan hệ. Lá bài như một cầu vồng rực rỡ sau cơn mưa, mang đến cảm giác an toàn như khi được thực sự trở về nhà.",
      "en": "Ten of Cups carries the energy of wholeness and peace in relationships. The card is like a vibrant rainbow after rain, bringing the safe feeling of truly returning home."
    },
    "personalityPortrait": {
      "vi": "Như một mái ấm che chở, Ten of Cups ôm lấy mọi mảnh ghép của bạn. Họ nhắc bạn rằng tình yêu đích thực không yêu cầu bạn phải hoàn hảo, mà chỉ cần bạn là chính mình.",
      "en": "Like a sheltering home, Ten of Cups embraces every piece of you. They remind you that true love doesn't require perfection, only that you be yourself."
    }
  },
  "minor-cups-page": {
    "intro": {
      "vi": "Page of Cups mang năng lượng của trực giác tươi mới và những thông điệp bất ngờ từ trái tim. Lá bài khuyến khích bạn mở lòng với những cảm xúc lạ lẫm mà không cần tìm cách phân tích chúng.",
      "en": "Page of Cups carries the energy of fresh intuition and unexpected messages from the heart. The card encourages you to open up to unfamiliar feelings without trying to analyze them."
    },
    "personalityPortrait": {
      "vi": "Giống như một người mộng mơ, Page of Cups rủ bạn nhìn thế giới qua lăng kính thơ ngây. Họ giúp bạn tìm thấy nguồn cảm hứng ở những điều nhỏ bé và kỳ lạ nhất xung quanh.",
      "en": "Like a dreamer, Page of Cups invites you to view the world through innocent eyes. They help you find inspiration in the smallest and strangest things around you."
    }
  },
  "minor-cups-knight": {
    "intro": {
      "vi": "Knight of Cups mang năng lượng của sự lãng mạn và theo đuổi lý tưởng. Lá bài là lời mời gọi can đảm sống đúng với tiếng gọi của trái tim, mang theo sự dịu dàng làm áo giáp.",
      "en": "Knight of Cups carries the energy of romance and pursuing ideals. The card is an invitation to courageously live true to the heart's calling, wearing gentleness as armor."
    },
    "personalityPortrait": {
      "vi": "Nếu là một người bạn, Knight of Cups sẽ cổ vũ bạn bước tới vì những điều bạn trân trọng. Họ nhắc bạn rằng hành động xuất phát từ tình yêu và sự thấu cảm sẽ luôn có sức mạnh lớn lao.",
      "en": "If it were a friend, Knight of Cups would cheer you on to step forward for what you cherish. They remind you that actions born of love and empathy always hold great power."
    }
  },
  "minor-cups-queen": {
    "intro": {
      "vi": "Queen of Cups mang năng lượng của vùng nước sâu thẳm, nơi chứa đựng sự thấu cảm bao la. Lá bài đại diện cho khả năng ôm ấp nỗi đau của người khác mà không đánh mất đi sự bình yên nội tại.",
      "en": "Queen of Cups carries the energy of deep waters, holding immense empathy. The card represents the ability to embrace the pain of others without losing inner peace."
    },
    "personalityPortrait": {
      "vi": "Như một người chữa lành an tĩnh, Queen of Cups luôn có đủ không gian cho những tổn thương của bạn. Họ mời bạn kết nối với biển lớn bên trong mình, nơi mọi cảm xúc đều được vỗ về.",
      "en": "Like a serene healer, Queen of Cups always has space for your wounds. They invite you to connect with the vast ocean within, where all emotions are comforted."
    }
  },
  "minor-cups-king": {
    "intro": {
      "vi": "King of Cups mang năng lượng của trí tuệ cảm xúc vững vàng. Lá bài là minh chứng cho việc bạn có thể cảm nhận vạn vật rất sâu sắc, nhưng vẫn giữ được sự tĩnh tại để đưa ra định hướng sáng suốt.",
      "en": "King of Cups carries the energy of steady emotional intelligence. The card is proof that you can feel everything deeply, yet maintain the calm needed to provide clear direction."
    },
    "personalityPortrait": {
      "vi": "Nếu là một người dẫn dắt, King of Cups sẽ không để cơn sóng cảm xúc cuốn trôi cả hai. Họ giúp bạn làm chủ nội tâm, biến sự nhạy cảm thành sức mạnh bảo vệ vững chắc.",
      "en": "As a guide, King of Cups would not let waves of emotion wash you both away. They help you master your interior, turning sensitivity into a strong protective power."
    }
  },

  // SWORDS
  "minor-swords-ace": {
    "intro": {
      "vi": "Ace of Swords mang năng lượng của sự thật sắc bén như thanh gươm vung lên xé toạc sương mù. Lá bài đánh dấu khoảnh khắc bạn nhìn thấu ảo ảnh và nắm lấy một sự thấu suốt mạnh mẽ.",
      "en": "Ace of Swords carries the energy of sharp truth like a sword cutting through fog. The card marks the moment you see through illusions and grasp a powerful clarity."
    },
    "personalityPortrait": {
      "vi": "Giống như một luồng gió lạnh nhưng tỉnh táo, Ace of Swords không nhân nhượng với sự tự lừa dối. Họ khích lệ bạn dùng lý trí sáng suốt để mở ra con đường phía trước.",
      "en": "Like a cold but sobering wind, Ace of Swords makes no compromises with self-deception. They encourage you to use clear reasoning to open the path ahead."
    }
  },
  "minor-swords-two": {
    "intro": {
      "vi": "Two of Swords mang năng lượng của sự đóng băng và bế tắc tự nguyện. Lá bài phản chiếu một tâm trí đang nhắm mắt lại để tránh né một quyết định khó khăn cần phải đưa ra.",
      "en": "Two of Swords carries the energy of freezing and voluntary standstill. The card reflects a mind closing its eyes to avoid a difficult decision that must be made."
    },
    "personalityPortrait": {
      "vi": "Nếu là một người quan sát, Two of Swords nhắc bạn rằng việc chối bỏ sự thật không làm nó biến mất. Họ mời bạn tháo dải băng bịt mắt, đối diện với ranh giới và lựa chọn điều cần thiết.",
      "en": "If it were an observer, Two of Swords reminds you that denying truth doesn't make it disappear. They invite you to remove the blindfold, face the boundary, and make the necessary choice."
    }
  },
  "minor-swords-three": {
    "intro": {
      "vi": "Three of Swords mang năng lượng của nỗi đau sắc nhọn và sự chia cắt. Dù mang sắc thái buồn bã, lá bài là sự giải phẫu cần thiết để phần mủ ẩn sâu được thoát ra ngoài, nhường chỗ cho sự chữa lành.",
      "en": "Three of Swords carries the energy of sharp pain and separation. Though sorrowful, the card is a necessary surgery so the hidden poison can drain, making way for healing."
    },
    "personalityPortrait": {
      "vi": "Như một người bạn thành thật, Three of Swords không che giấu thực tại tàn khốc. Họ ngồi cạnh bạn trong cơn mưa, giúp bạn chấp nhận rằng trái tim phải vỡ ra để ánh sáng lọt vào.",
      "en": "Like an honest friend, Three of Swords does not hide harsh reality. They sit with you in the rain, helping you accept that the heart must break open for light to enter."
    }
  },
  "minor-swords-four": {
    "intro": {
      "vi": "Four of Swords mang năng lượng của sự đình chiến tĩnh lặng. Lá bài là khoảng nghỉ ngơi thiêng liêng để tâm trí bạn được hồi phục sau những cuộc giằng xé nội tâm mệt nhoài.",
      "en": "Four of Swords carries the energy of a quiet truce. The card is a sacred resting period for your mind to recover after exhausting inner struggles."
    },
    "personalityPortrait": {
      "vi": "Giống như một góc trú ẩn an toàn, Four of Swords yêu cầu bạn hạ vũ khí xuống. Họ nhắc nhở rằng đôi khi, hành động dũng cảm nhất chính là cho phép bản thân chìm vào tĩnh lặng.",
      "en": "Like a safe sanctuary, Four of Swords asks you to lower your weapons. They remind you that sometimes, the bravest action is allowing yourself to sink into stillness."
    }
  },
  "minor-swords-five": {
    "intro": {
      "vi": "Five of Swords mang năng lượng của những xung đột mà phần thắng đi kèm với cái giá quá đắt. Lá bài mời bạn nhìn lại xem cuộc chiến này có thực sự đáng để bạn đánh đổi sự bình yên và các mối quan hệ hay không.",
      "en": "Five of Swords carries the energy of conflicts where victory comes at too high a cost. The card invites you to look back at whether this battle is truly worth trading your peace and relationships for."
    },
    "personalityPortrait": {
      "vi": "Nếu là một chiến lược gia, Five of Swords khuyên bạn nên lùi lại. Họ giúp bạn nhận ra rằng đôi khi việc từ bỏ một tranh cãi vô nghĩa mới là chiến thắng thực sự.",
      "en": "If it were a strategist, Five of Swords advises you to step back. They help you realize that sometimes abandoning a pointless argument is the true victory."
    }
  },
  "minor-swords-six": {
    "intro": {
      "vi": "Six of Swords mang năng lượng của cuộc di cư thầm lặng khỏi bến bờ giông bão. Dù còn vương vấn nỗi buồn, lá bài xác nhận rằng bạn đang nhẹ nhàng lướt đi về phía những vùng nước bình yên hơn.",
      "en": "Six of Swords carries the energy of a quiet migration away from stormy shores. Though carrying residual sadness, the card confirms you are gently gliding toward more peaceful waters."
    },
    "personalityPortrait": {
      "vi": "Như một người lái đò nhẫn nại, Six of Swords giúp bạn mang theo những bài học thay vì gánh nặng. Họ vỗ về bạn trên hành trình chuyển giao, hướng ánh nhìn về chân trời sáng sủa phía trước.",
      "en": "Like a patient ferryman, Six of Swords helps you carry lessons instead of burdens. They comfort you on the journey of transition, pointing your gaze to the brighter horizon ahead."
    }
  },
  "minor-swords-seven": {
    "intro": {
      "vi": "Seven of Swords mang năng lượng của chiến lược khôn khéo và sự bảo vệ tài nguyên cá nhân. Lá bài nhắc nhở bạn rằng đôi khi cần một chút kín đáo và lối đi vòng để rời khỏi hoàn cảnh không có lợi.",
      "en": "Seven of Swords carries the energy of clever strategy and guarding personal resources. The card reminds you that sometimes discretion and a detour are needed to exit an unfavorable situation."
    },
    "personalityPortrait": {
      "vi": "Nếu là một người bảo vệ khôn ngoan, Seven of Swords khuyên bạn không cần phải phơi bày tất cả mọi thứ. Họ giúp bạn nhận diện những điều cần giữ lại cho riêng mình để bảo toàn năng lượng.",
      "en": "If it were a wise protector, Seven of Swords advises you not to expose everything. They help you identify what needs to be kept to yourself to preserve your energy."
    }
  },
  "minor-swords-eight": {
    "intro": {
      "vi": "Eight of Swords mang năng lượng của những lồng giam do chính tâm trí dựng lên. Lá bài phản chiếu một tình cảnh mà bạn tưởng chừng bế tắc, nhưng thực ra quyền tự do tháo gỡ vẫn luôn nằm trong tay bạn.",
      "en": "Eight of Swords carries the energy of cages built by the mind itself. The card reflects a situation where you feel trapped, but the freedom to untie yourself is actually still in your hands."
    },
    "personalityPortrait": {
      "vi": "Giống như một ánh sáng len lỏi qua kẽ hở, Eight of Swords nhắc bạn ngừng phóng đại nỗi sợ. Họ khuyến khích bạn bước những bước nhỏ xíu ra khỏi sự tự giới hạn của chính mình.",
      "en": "Like a light slipping through a crack, Eight of Swords reminds you to stop magnifying fear. They encourage you to take tiny steps out of your self-imposed limitations."
    }
  },
  "minor-swords-nine": {
    "intro": {
      "vi": "Nine of Swords mang năng lượng của màn đêm tăm tối, nơi lo âu và tự trách bị thổi phồng. Lá bài là sự đồng cảm sâu sắc với nỗi bất an của bạn, nhưng cũng khẳng định phần lớn chúng chỉ là bóng ma do tâm trí vẽ ra.",
      "en": "Nine of Swords carries the energy of the dark night, where anxiety and self-blame are inflated. The card deeply empathizes with your insecurity, but affirms most of it is merely ghosts drawn by the mind."
    },
    "personalityPortrait": {
      "vi": "Như một người bật công tắc đèn giữa đêm, Nine of Swords khuyên bạn đừng ở một mình trong bóng tối suy nghĩ. Họ mời bạn đối diện với nỗi sợ dưới ánh sáng thực tại để thấy chúng không đáng sợ đến thế.",
      "en": "Like someone flipping the light switch in the middle of the night, Nine of Swords advises you not to stay alone in the dark of thought. They invite you to face fears in the light of reality to see they aren't that scary."
    }
  },
  "minor-swords-ten": {
    "intro": {
      "vi": "Ten of Swords mang năng lượng của điểm chạm đáy. Lá bài không hề tàn nhẫn, nó chỉ đánh dấu một sự kết thúc triệt để để bạn biết rằng điều tồi tệ nhất đã qua đi, và từ đây chỉ có con đường đi lên.",
      "en": "Ten of Swords carries the energy of hitting rock bottom. The card is not cruel; it merely marks a radical end so you know the worst has passed, and from here the only way is up."
    },
    "personalityPortrait": {
      "vi": "Nếu là một người bạn, Ten of Swords sẽ gỡ những thanh gươm trên lưng bạn xuống. Họ nhẹ nhàng bảo bạn hãy cho phép câu chuyện cũ kết thúc hoàn toàn, để ánh bình minh mới có cơ hội ló rạng.",
      "en": "If it were a friend, Ten of Swords would remove the swords from your back. They gently tell you to let the old story completely end, so a new dawn has a chance to rise."
    }
  },
  "minor-swords-page": {
    "intro": {
      "vi": "Page of Swords mang năng lượng của sự tò mò, cảnh giác và khao khát tìm hiểu sự thật. Lá bài là một lăng kính sắc bén giúp bạn thu thập thông tin và đặt ra những câu hỏi chưa ai dám hỏi.",
      "en": "Page of Swords carries the energy of curiosity, vigilance, and the desire to seek truth. The card is a sharp lens helping you gather information and ask questions no one else dares to."
    },
    "personalityPortrait": {
      "vi": "Như một người quan sát sắc sảo, Page of Swords khuyên bạn hãy luôn tỉnh táo và tò mò. Họ nhắc nhở bạn dùng ngôn từ linh hoạt nhưng cũng cẩn trọng để khám phá bản chất thực sự của vấn đề.",
      "en": "Like a sharp observer, Page of Swords advises you to stay alert and curious. They remind you to use words flexibly but carefully to discover the true nature of the issue."
    }
  },
  "minor-swords-knight": {
    "intro": {
      "vi": "Knight of Swords mang năng lượng của ý chí tốc độ, lao thẳng về phía trước để bảo vệ quan điểm. Lá bài là một luồng không khí dứt khoát, cắt đứt sự ngập ngừng và thúc đẩy hành động chớp nhoáng.",
      "en": "Knight of Swords carries the energy of fast-paced will, charging forward to defend a stance. The card is a decisive rush of air, cutting through hesitation and prompting lightning action."
    },
    "personalityPortrait": {
      "vi": "Nếu là một người đồng hành, Knight of Swords sẽ kéo bạn chạy theo ý tưởng mãnh liệt. Tuy nhiên, họ cũng khuyên bạn nên giữ một nhịp phanh để không biến lý lẽ sắc bén thành vũ khí làm tổn thương người khác.",
      "en": "If it were a companion, Knight of Swords would pull you to run after a fierce idea. However, they also advise you to keep a brake ready so sharp logic doesn't turn into a weapon that hurts others."
    }
  },
  "minor-swords-queen": {
    "intro": {
      "vi": "Queen of Swords mang năng lượng của ranh giới vô hình nhưng bất khả xâm phạm. Lá bài đại diện cho một tâm trí độc lập, nhìn nhận vạn vật rõ ràng, không bị che mờ bởi những tình cảm uỷ mị.",
      "en": "Queen of Swords carries the energy of an invisible yet inviolable boundary. The card represents an independent mind, seeing all things clearly, unclouded by sentimental feelings."
    },
    "personalityPortrait": {
      "vi": "Giống như một người tư vấn trung thực tuyệt đối, Queen of Swords không nói điều bạn muốn nghe, mà nói điều bạn cần nghe. Họ mời bạn thiết lập ranh giới rõ ràng và đối diện với sự thật một cách đoan trang.",
      "en": "Like a strictly honest counselor, Queen of Swords doesn't tell you what you want to hear, but what you need to hear. They invite you to set clear boundaries and face truth with dignity."
    }
  },
  "minor-swords-king": {
    "intro": {
      "vi": "King of Swords mang năng lượng của phán đoán sáng suốt và tư duy khách quan. Lá bài là hiện thân của sự công lý minh bạch, dùng trí tuệ sắc bén để duy trì trật tự và mang lại sự rõ ràng cho mọi tình huống.",
      "en": "King of Swords carries the energy of clear judgment and objective thinking. The card embodies transparent justice, using sharp intellect to maintain order and bring clarity to any situation."
    },
    "personalityPortrait": {
      "vi": "Nếu là một người dẫn dắt, King of Swords sẽ giúp bạn tách bạch cảm xúc khỏi sự thật. Họ khuyên bạn lùi lại để nhìn bức tranh lớn, từ đó đưa ra những quyết định công bằng và có nền tảng vững chắc.",
      "en": "As a guide, King of Swords helps you separate emotion from facts. They advise you to step back to see the big picture, making fair decisions with a solid foundation."
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
console.log(`Successfully updated ${updatedCount} Cups and Swords cards.`);
