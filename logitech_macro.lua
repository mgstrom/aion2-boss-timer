-- 罗技G Hub Lua宏
-- 根据用户提供的宏图片创建

function OnEvent(event, arg)
    if event == "G_PRESSED" and arg == 1 then -- 假设绑定到G1键
        -- 按照图片中的顺序执行按键序列
        
        -- 向下箭头
        PressKey("Down")
        ReleaseKey("Down")
        Sleep(1) -- 1毫秒延迟
        
        -- 减号 (-)
        PressKey("-")
        ReleaseKey("-")
        Sleep(1) -- 1毫秒延迟
        
        -- 等号 (=)
        PressKey("=")
        ReleaseKey("=")
        Sleep(1) -- 1毫秒延迟
        
        -- 等号 (=)
        PressKey("=")
        ReleaseKey("=")
        Sleep(1) -- 1毫秒延迟
        
        -- 向上箭头
        PressKey("Up")
        ReleaseKey("Up")
        Sleep(1) -- 1毫秒延迟
        
        -- 右方括号 (])
        PressKey("]")
        ReleaseKey("]")
        Sleep(1) -- 1毫秒延迟
        
        -- 右方括号 (])
        PressKey("]")
        ReleaseKey("]")
    elseif event == "KEY_PRESSED" then
        -- 当按下1、r、t键时，暂停5毫秒
        if arg == "1" or arg == "r" or arg == "t" then
            Sleep(5) -- 5毫秒延迟
        end
    end
end